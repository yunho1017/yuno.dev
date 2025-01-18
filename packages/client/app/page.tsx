import React from "react";
async function getBlogPosts() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return [
    { id: 1, title: "First Post", content: "Hello world!" },
    { id: 2, title: "Second Post", content: "More content here" },
  ];
}

export default async function BlogContent() {
  const posts = await getBlogPosts();

  return (
    <div className="blog-content">
      {posts.map((post) => (
        <a href={`/post/${post.id}`}>
          <article key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.content}</p>
          </article>
        </a>
      ))}
    </div>
  );
}
