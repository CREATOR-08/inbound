export type ServerSentEvent = {
  event: string;
  data: string;
};

export async function* readSSEEvents(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<ServerSentEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "";
  let data: string[] = [];

  const parseLine = (line: string): ServerSentEvent | null => {
    if (!line) {
      if (data.length === 0) {
        event = "";
        return null;
      }
      const result = { event: event || "message", data: data.join("\n") };
      event = "";
      data = [];
      return result;
    }
    if (line.startsWith(":")) return null;

    const separator = line.indexOf(":");
    const field = separator < 0 ? line : line.slice(0, separator);
    const value = separator < 0 ? "" : line.slice(separator + 1).replace(/^ /, "");
    if (field === "event") event = value;
    if (field === "data") data.push(value);
    return null;
  };

  const onAbort = () => {
    void reader.cancel();
  };
  signal?.addEventListener("abort", onAbort);
  let streamComplete = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (signal?.aborted) throw new DOMException("The request was aborted.", "AbortError");
      if (done) {
        streamComplete = true;
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const trailingCarriageReturn = buffer.endsWith("\r");
      const complete = trailingCarriageReturn ? buffer.slice(0, -1) : buffer;
      const lines = complete.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
      buffer = trailingCarriageReturn
        ? `${lines.pop() ?? ""}\r`
        : lines.pop() ?? "";
      for (const line of lines) {
        const parsed = parseLine(line);
        if (parsed) yield parsed;
      }
    }

    buffer += decoder.decode();
    const lines = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    for (const line of lines) {
      const parsed = parseLine(line);
      if (parsed) yield parsed;
    }
    const finalEvent = parseLine("");
    if (finalEvent) yield finalEvent;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    if (!streamComplete) await reader.cancel();
    reader.releaseLock();
  }
}

const decodePayload = (data: string): unknown => {
  try {
    return JSON.parse(data);
  } catch {
    throw new Error("The assistant returned an invalid streaming response.");
  }
};

export async function consumeAssistantSSE(
  response: Response,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<unknown> {
  if (!response.body) {
    throw new Error("The assistant returned an empty streaming response.");
  }

  for await (const event of readSSEEvents(response.body, signal)) {
    if (event.event === "token") {
      const token = decodePayload(event.data);
      if (typeof token !== "string") {
        throw new Error("The assistant returned an invalid text chunk.");
      }
      onToken(token);
    } else if (event.event === "done") {
      return decodePayload(event.data);
    } else if (event.event === "error") {
      const payload = decodePayload(event.data);
      throw new Error(
        typeof payload === "string"
          ? payload
          : "The assistant could not process your request.",
      );
    }
  }

  throw new Error("The assistant stream ended before completion.");
}
