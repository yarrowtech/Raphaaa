
import { RiCustomerServiceFill } from "react-icons/ri";
import axios from "axios";
import logo from "../../assets/logo1.png";
import useSmartLoader from "../../hooks/useSmartLoader";
import { getActiveSocialLinks, getSocialIcon, getSocialIconClassName } from "../../utils/socialLinks";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
      <div className="bg-gradient-to-r from-sky-100 via-sky-300 to-sky-50 text-zinc-800">
        <div className="container mx-auto flex justify-between items-center py-3 px-4 sm:px-6 lg:px-8">
          <div className="hidden md:flex items-center space-x-4">
            <div className="h-5 w-5 bg-sky-200 rounded-full animate-pulse"></div>
            <div className="h-5 w-5 bg-sky-200 rounded-full animate-pulse"></div>
          </div>
          <div className="text-sm text-center flex-grow">
            <div className="h-4 w-60 mx-auto bg-sky-200 rounded animate-pulse"></div>
          </div>
          <div className="text-sm hidden md:block">
            <div className="h-4 w-28 bg-sky-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-sky-100 via-sky-300 to-sky-50 text-zinc-800">
      <div className="container mx-auto flex justify-between items-center py-3 px-4 sm:px-6 lg:px-8">
        {/* Left: Social Icons */}
        <span className="font-semibold text-xs mr-3 hidden md:flex md:flex-wrap md:justify-center md:items-center md:gap-1">Follow Us:</span>
        <div className="hidden md:flex items-center space-x-4">
          {socialLinks.map((link) => {
            const Icon = getSocialIcon(link.platform);
            return (
              <a
                key={link.id}
                href={link.url}
                className="transition-transform duration-200 hover:scale-110"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                title={link.label}
              >
                <Icon className={`h-5 w-5 ${getSocialIconClassName(link.platform, "text-sky-600")}`} />
              </a>
            );
          })}
        </div>

        {/* Center: Shipping message */}
        <div className="text-sm text-center flex-grow font-medium text-gray-800">
          <div className="block flex items-center justify-center space-x-2">
            {/* <marquee behavior="scroll" direction="left" scrollamount="5">
                {contactInfo?.showTopText && (
                  <span className="font-semibold">
                    {contactInfo.topText}
                  </span>
                )}
            </marquee> */}
            {/* <Link to="/" className="flex items-center space-x-2 group shrink-0" title="Raphaaa">
              <img src={logo} alt="Logo" className="h-8 sm:h-9 md:h-10 w-auto transition-transform duration-300 group-hover:scale-105" />
            </Link> */}
          </div>
          <div className="hidden md:block">
            {contactInfo?.showTopText && (
              <marquee behavior="scroll" direction="left" scrollamount="5" className="w-3/5">
                {/* We ship worldwide — <span className="text-blue-700">Fast & Reliable Shipping!</span> */}
                {contactInfo.topText}
              </marquee>
            )}
          </div>
        </div>

        {/* Right: Phone Number */}
        {contactInfo?.showPhone && (
          <div className="text-sm hidden md:flex md:flex-wrap md:justify-center md:items-center md:gap-1">
            <RiCustomerServiceFill size={16} className='font-bold' /> <span className="font-semibold text-xs"> Helpline: </span>
            <a
              href={`tel:${contactInfo.phone}`}
              className="text-blue-700 font-semibold hover:text-sky-600 transition-colors duration-200"
            >
              {contactInfo.phone}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Topbar;
