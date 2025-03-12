import TopNav from "./components/TopNav";
import WelcomeContent from "./components/WelcomeContent";
import Footer from "./components/Footer";

const WelcomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9F7F0] relative">
      <TopNav />
      <WelcomeContent />
      <Footer />
    </div>
  );
};

export default WelcomePage;
