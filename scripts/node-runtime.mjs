// Nitro owns the HTTP server. Bind publicly and honor the platform-assigned port.
process.env.NITRO_HOST = "0.0.0.0";
if (process.env.PORT) process.env.NITRO_PORT = process.env.PORT;
