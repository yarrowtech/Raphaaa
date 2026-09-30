
import { RiCustomerServiceFill } from "react-icons/ri";
import axios from "axios";
import useSmartLoader from "../../hooks/useSmartLoader";
import { getActiveSocialLinks, getSocialIcon, getSocialIconClassName } from "../../utils/socialLinks";

const Topbar = () => {
  // const [loading, setLoading] = useState(true);
  // const [contactInfo, setContactInfo] = useState(null);

  // useEffect(() => {
  //   const timer = setTimeout(() => setLoading(false), 1000);
  //   return () => clearTimeout(timer);
  // }, []);

  const { loading, data: contactInfo } = useSmartLoader(async () => {
    const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/settings/contact`);
    return res.data;
  })
  const socialLinks = getActiveSocialLinks(contactInfo);

  // useEffect(() => {
  //   const fetchContactInfo = async () => {
  //     try {
  //       const res = await axios.get(
  //         `${import.meta.env.VITE_BACKEND_URL}/api/settings/contact`
  //       );
  //       setContactInfo(res.data);
  //     } catch (err) {
  //       console.error("Failed to load contact settings", err);
  //     }
  //   };
  //   fetchContactInfo();
  // }, []);

  if (loading) {
    return (
      <div className="bg-[#1c1b1b] text-white">
        <div className="container mx-auto flex justify-between items-center py-2 px-4 sm:px-6 lg:px-8">
          <div className="hidden md:flex items-center space-x-4">
            <div className="h-5 w-5 bg-white/10 rounded-full animate-pulse"></div>
            <div className="h-5 w-5 bg-white/10 rounded-full animate-pulse"></div>
          </div>
          <div className="text-sm text-center flex-grow">
            <div className="h-3 w-60 mx-auto bg-white/10 rounded animate-pulse"></div>
          </div>
          <div className="text-sm hidden md:block">
            <div className="h-3 w-28 bg-white/10 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1c1b1b] text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
    </div>
  );
};

export default Topbar;
