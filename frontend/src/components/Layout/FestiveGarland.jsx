import topGarland from "../../assets/festive-top.svg";
import bottomGarland from "../../assets/festive-bottom.svg";

export default function FestiveGarland({ variant = "top" }) {
  return <img src={variant === "top" ? topGarland : bottomGarland} alt="" aria-hidden="true" className={`festive-garland festive-garland-${variant}`} />;
}
