import darkModeImage from "../assets/ethereal-nexus-logo-dark-mode.jpg";

export const LogoImageSite = () => {
  return (
    <img
      src={darkModeImage.src}
      alt="Ethereal Nexus Logo"
      className="h-4 self-end justify-self-end filter invert hue-rotate-180 dark:filter-none"
    />
  );
};

export default LogoImageSite;
