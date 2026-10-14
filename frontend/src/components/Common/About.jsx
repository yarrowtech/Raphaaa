import useContent from "../../hooks/useContent";
import aboutImg from "../../assets/product3.jpg";
import cleanHtml from "../../utils/sanitizeHtml";

const About = () => {
  const { data, loading, error, retry } = useContent("/api/settings/about");
  const aboutContent = data?.content || "";

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-7xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          {/* Left: Image */}
          <div className="h-full w-full">
            <img
              src={aboutImg}
              alt="About Raphaa"
              className="h-full w-full object-cover"
            />
          </div>

          {/* Right: Dynamic Content */}
          <div className="p-8 md:p-12 flex flex-col justify-center space-y-5 text-gray-800">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-2">
              About <span className="text-blue-600">RAPHAAA</span>
            </h1>

            {error ? (<p role="alert">Unable to load content. <button onClick={retry}>Retry</button></p>) : aboutContent ? (
              <div
                className="text-lg leading-relaxed space-y-4"
                dangerouslySetInnerHTML={{ __html: cleanHtml(aboutContent) }}
              />
            ) : (
              <p className="text-gray-500">{loading ? "Loading content…" : "Content coming soon."}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
