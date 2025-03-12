import TopNav from "./components/TopNav";
import SynthesisContent from "./components/SynthesisContent";
import Footer from "./components/Footer";

const SynthesisPage = () => {
  return (
    <div className="min-h-screen bg-[#F9F7F0]">
      <TopNav />
      <SynthesisContent />
      <Footer />
    </div>
  );
};

export default SynthesisPage;