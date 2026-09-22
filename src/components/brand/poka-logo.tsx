export function PokaLogo({
  className = "h-10 w-auto sm:h-12",
  alt = "POKA",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/poka-logo.png" alt={alt} className={className} />
  );
}
