/** Create a small sequence gate for ignoring stale asynchronous responses. */
export function createRequestSequence() {
  let current = 0;
  return {
    begin() {
      current += 1;
      return current;
    },
    isCurrent(requestId) {
      return requestId === current;
    },
    invalidate() {
      current += 1;
      return current;
    }
  };
}
