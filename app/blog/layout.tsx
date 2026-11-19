import "@/styles/blog.css";
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="blog-shell min-h-screen bg-background">{children}</div>
  );
}
