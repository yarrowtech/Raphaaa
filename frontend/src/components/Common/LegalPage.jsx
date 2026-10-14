import useContent from "../../hooks/useContent";
import cleanHtml from "../../utils/sanitizeHtml";

const TITLES = {
  "terms":               { title: "Terms & Conditions",      accent: "text-sky-600" },
  "shipping-policy":     { title: "Shipping Policy",         accent: "text-emerald-600" },
  "return-policy":       { title: "Return & Refund Policy",  accent: "text-rose-600" },
  "cancellation-policy": { title: "Cancellation Policy",     accent: "text-amber-600" },
};

const LegalPage = ({ type }) => {
  const { data: page, loading, error, retry } = useContent(`/api/legal/${type}`);
  const { title, accent } = TITLES[type] || { title: "Policy", accent: "text-sky-600" };


  const words = title.split(" ");
  const last  = words.pop();

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl px-6 md:px-12 py-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-center text-gray-800 mb-8">
          {words.join(" ")} <span className={accent}>{last}</span>
        </h1>

        {error ? (<p role="alert">Unable to load content. <button onClick={retry}>Retry</button></p>) : loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400 text-sm">
            <span className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            Loading…
          </div>
        ) : page?.content ? (
          <>
            <div
              className="prose prose-gray max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: cleanHtml(page.content) }}
            />
            {page.updatedAt && (
              <p className="text-xs text-gray-400 mt-8 text-right border-t border-gray-100 pt-4">
                Last updated:{" "}
                {new Date(page.updatedAt).toLocaleDateString("en-IN", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            )}
          </>
        ) : (
          <p className="text-center text-gray-400 py-16 text-sm">Content coming soon.</p>
        )}
      </div>
    </div>
  );
};

export default LegalPage;
