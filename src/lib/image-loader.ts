type ImageLoaderOptions = { src: string };

// The site serves already-optimized R2 variants through its asset route.
// This loader keeps next/image from creating a request-time native optimizer.
export default function imageLoader({ src }: ImageLoaderOptions) {
  return src;
}
