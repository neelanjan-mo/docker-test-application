export const logger = {
  info: (msg: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== "test")
      console.log(JSON.stringify({ level: "info", msg, meta }));
  },
  error: (msg: string, meta?: unknown) => {
    console.error(JSON.stringify({ level: "error", msg, meta }));
  },
};
