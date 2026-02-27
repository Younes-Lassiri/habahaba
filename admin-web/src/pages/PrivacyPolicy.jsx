import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  MapPin, 
  Camera, 
  Eye, 
  Database, 
  UserCheck, 
  Mail, 
  ArrowLeft, 
  Download 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore'; // Adjust path if needed

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Privacy Policy</h1>
          <p className="text-gray-600 mt-1">Haba Haba – Food Delivery (Laayoune)</p>
        </div>
        <div className="flex gap-3 no-print">
          {isAuthenticated && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-8 md:p-12">
          
          <div className="mb-10 pb-6 border-b border-gray-100">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-2">Data Protection</p>
            <p className="text-gray-500 italic">Effective Date: February 20, 2026</p>
          </div>

          <div className="space-y-12">
            
            {/* Introduction */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-800">Introduction</h2>
              </div>
              <p className="text-gray-600 leading-relaxed pl-9">
                Haba Haba – Food Delivery respects your privacy. This Privacy Policy explains 
                what information we collect, how we use it, and how we protect it while serving 
                guests of our Haba Haba restaurant in Laayoune. This is a single-restaurant 
                delivery app, not a marketplace.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-800">Information We Collect</h2>
              </div>
              <ul className="space-y-3 pl-9">
                {[
                  "Account information: name, phone number, and email to create and manage your account.",
                  "Delivery information: address, delivery instructions, and contact details to deliver orders accurately.",
                  "Location data (when you allow it): to help you set your delivery address and improve delivery accuracy.",
                  "Order information: items ordered, order history, and order status updates to fulfill your requests.",
                  "Profile image (optional): if you choose to upload a profile picture using camera or photo library.",
                  "App and device data: app version, device type, diagnostics and crash logs to keep the app stable."
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* Camera & Photo Library */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Camera className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-800">Camera & Photo Library</h2>
              </div>
              <p className="text-gray-600 leading-relaxed pl-9 mb-4">
                If you choose to add a profile picture, we may request access to your camera and/or photo library. This is optional and only used to let you upload your image.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg ml-9 space-y-2">
                <p className="text-sm text-gray-600"><strong>Camera:</strong> used only when you choose to take a photo for your profile.</p>
                <p className="text-sm text-gray-600"><strong>Photo Library:</strong> used only when you choose to select an existing image for your profile.</p>
              </div>
            </section>

            {/* Location Data */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-800">Location Data</h2>
              </div>
              <p className="text-gray-600 leading-relaxed pl-9">
                With your permission, we use location services to help you set your delivery address 
                and improve delivery accuracy. You can control location permissions at any time 
                in your device settings. If you disable location, you can still enter your address manually.
              </p>
            </section>

            {/* Third-Party Services */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-800">Third-Party Services</h2>
              </div>
              <p className="text-gray-600 leading-relaxed pl-9 mb-4">
                We use trusted third-party services to provide core app features:
              </p>
              <ul className="space-y-3 pl-9">
                <li className="flex gap-3 text-gray-600">
                  <span className="font-bold text-primary-700">Firebase:</span> used for authentication, app analytics, and crash diagnostics.
                </li>
                <li className="flex gap-3 text-gray-600">
                  <span className="font-bold text-primary-700">Google Maps:</span> used to help select and display delivery locations and improve address accuracy.
                </li>
              </ul>
            </section>

            {/* Security */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-800">Security</h2>
              </div>
              <p className="text-gray-600 leading-relaxed pl-9">
                We use reasonable technical and organizational measures to protect your information. 
                No method of transmission or storage is 100% secure, but we work continuously 
                to protect data and limit access to authorized staff and systems only.
              </p>
            </section>

            {/* Contact */}
            <section className="pt-10 border-t border-gray-100">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="bg-primary-100 p-3 rounded-full">
                    <Mail className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Privacy Support</h3>
                    <p className="text-primary-600 font-medium hover:underline cursor-pointer">
                      habahaba@gmail.com
                    </p>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-sm text-gray-400 uppercase font-bold tracking-widest">
                    &copy; 2026 Haba Haba Business
                  </p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}