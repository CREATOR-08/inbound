export interface SharedEmailBodyRequest<T> {
  promise: Promise<T>;
  controller: AbortController;
  consumers: number;
  settled: boolean;
}

export const getOrCreateEmailBodyRequest = <T>(
  requests: Map<string, SharedEmailBodyRequest<T>>,
  emailId: string,
  fetchBody: (signal: AbortSignal) => Promise<T>,
): SharedEmailBodyRequest<T> => {
  const current = requests.get(emailId);
  if (current && !current.controller.signal.aborted) return current;

  const controller = new AbortController();
  const request: SharedEmailBodyRequest<T> = {
    promise: Promise.resolve().then(() => fetchBody(controller.signal)).finally(() => {
      request.settled = true;
      if (requests.get(emailId) === request) requests.delete(emailId);
    }),
    controller,
    consumers: 0,
    settled: false,
  };
  requests.set(emailId, request);
  return request;
};
