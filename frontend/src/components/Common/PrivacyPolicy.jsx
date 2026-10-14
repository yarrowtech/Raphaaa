import useContent from "../../hooks/useContent";
import cleanHtml from "../../utils/sanitizeHtml";

const PrivacyPolicy = () => {
  const { data, loading, error, retry } = useContent("/api/settings/policy");
  const policy = data || { content: "", updatedAt: "" };

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-xl px-6 md:px-12 py-10">
        <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-8">
          Privacy <span className="text-blue-600">Policy</span>
        </h1>

        {error ? (<p role="alert">Unable to load content. <button onClick={retry}>Retry</button></p>) : policy.content ? (
          <div
            className="prose prose-gray max-w-none space-y-6 text-gray-700 text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: cleanHtml(policy.content) }}
          />
        ) : (
          <p className="text-center text-gray-500">{loading ? "Loading privacy policy…" : "Content coming soon."}</p>
        )}

        {policy.updatedAt && (
          <p className="text-sm text-gray-500 mt-6 text-right">
            Last updated: {new Date(policy.updatedAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
};

export default PrivacyPolicy;
