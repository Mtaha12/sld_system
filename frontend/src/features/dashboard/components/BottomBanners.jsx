import { Smartphone, PlayCircle, Apple } from 'lucide-react'; 
import fbrBanner from '../../../assets/branding/dashboard/fbr_digital_invoicing_banner.png';
import appStoreLogo from '../../../assets/branding/dashboard/app store.png';
import playStoreLogo from '../../../assets/branding/dashboard/playstore.png';

const BottomBanners = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-6 mt-4 lg:h-28">
      {/* App Download Banner */}
      <div className="flex-1 bg-white dark:bg-theme-surface border border-theme-border rounded-xl px-8 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-14 border-2 border-theme-main rounded-xl flex items-center justify-center shrink-0">
            <div className="w-1.5 h-1.5 bg-theme-main rounded-full mt-8"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-theme-main">Download</span>
            <span className="text-sm font-semibold text-theme-main whitespace-nowrap">mobile app from</span>
          </div>
        </div>
        
        <div className="hidden xl:block w-px h-10 bg-theme-border mx-2"></div>
        
        <div className="flex gap-4">
          <a
            href="https://apps.apple.com/pk/app/sld-system/id6741755009"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors h-12"
          >
            <img src={appStoreLogo} alt="App Store Icon" className="h-7 w-7 object-contain" />
            <div className="flex flex-col items-start">
              <span className="text-[10px] leading-none font-medium text-gray-200">Download on the</span>
              <span className="text-sm font-bold leading-tight mt-0.5">App Store</span>
            </div>
          </a>
          
          <a
            href="https://play.google.com/store/apps/details?id=com.sldsystem"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors h-12"
          >
            <img src={playStoreLogo} alt="Google Play Icon" className="h-7 w-7 object-contain" />
            <div className="flex flex-col items-start">
              <span className="text-[10px] leading-none font-medium text-gray-200">GET IT ON</span>
              <span className="text-sm font-bold leading-tight mt-0.5">Google Play</span>
            </div>
          </a>
        </div>
      </div>
      
      {/* Blue Sign-In Banner */}
      <div className="flex-1 rounded-xl overflow-hidden shadow-sm flex items-stretch">
        <img src={fbrBanner} alt="FBR Digital Invoicing Banner" className="w-full h-full object-cover rounded-xl" />
      </div>
    </div>
  );
};

export default BottomBanners;
