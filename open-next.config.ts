import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Keep the first release on the adapter's dummy cache. The application data
// and image objects already live in TiDB/R2; enabling OpenNext's R2 cache
// would require a second, separately managed cache bucket.
export default defineCloudflareConfig();
