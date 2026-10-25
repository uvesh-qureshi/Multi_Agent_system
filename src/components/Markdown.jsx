import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components = {
  // open every link in a new tab
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer noopener" />,
};

export default function Markdown({ children }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
