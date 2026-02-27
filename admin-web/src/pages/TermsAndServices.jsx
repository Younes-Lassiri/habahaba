import React from 'react';
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  ShieldCheck, 
  Info, 
  CreditCard, 
  Truck, 
  AlertTriangle, 
  Scale, 
  Mail 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsAndServices() {
  const navigate = useNavigate();

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Terms of Service</h1>
          <p className="text-gray-600 mt-1">Haba Haba – Food Delivery (Laayoune)</p>
        </div>
        <div className="flex gap-3 no-print">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
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
          
          <div className="mb-10 pb-6 border-b border-gray-100 text-center md:text-left">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-2">Legal Document</p>
            <p className="text-gray-500 italic">Effective Date: February 20, 2026</p>
          </div>

          <div className="space-y-12">
            
            {/* 1. Introduction */}
            <section className="group">
              <div className="flex items-center gap-3 mb-4">
                <Info className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-800">1. Introduction</h2>
              </div>
              <p className="text-gray-600 leading-relaxed pl-9">
                Welcome to <strong>Haba Haba – Food Delivery</strong>, the official delivery app for our Haba Haba restaurant in Laayoune. 
                This app lets you browse our menu, place orders, and receive delivery handled directly by Haba Haba and its own delivery team. 
                By creating an account or using the app, you agree to these Terms.
              </p>
            </section>

            {/* 2. Eligibility */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-800">2. Eligibility & Account Responsibility</h2>
              </div>
              <ul className="space-y-3 pl-9">
                {[
                  "You are at least 14 years old and able to enter into agreements.",
                  "You will keep your account details accurate and secure.",
                  "You are responsible for all activity under your account.",
                  "The app uses secure tokens to keep you signed in; keep your device and login safe and do not share access."
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 3. Service Description */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-800">3. Service Description</h2>
              </div>
              <ul className="space-y-3 pl-9">
                {[
                  "You place orders for Haba Haba restaurant only, directly inside this app.",
                  "Our kitchen prepares the food and is responsible for its quality, safety, and accuracy.",
                  "Haba Haba’s own delivery team coordinates pickup and drop-off to your address in Laayoune.",
                  "Estimated times are guidance; we work to keep them accurate and communicate delays when they occur."
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 4. Payments */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-800">4. Payments & Fees</h2>
              </div>
              <p className="text-gray-600 leading-relaxed pl-9 mb-4">
                Prices and delivery fees are shown before you confirm an order. Your chosen payment method 
                will be charged (or confirmed) when you place an order. If something goes wrong, 
                we review refunds fairly and case by case.
              </p>
            </section>

            {/* 5. Delivery */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Truck className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-800">5. Delivery</h2>
              </div>
              <ul className="space-y-3 pl-9">
                <li className="flex gap-3 text-gray-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-600 mt-2.5 shrink-0" />
                  Our Haba Haba delivery team handles pickup and drop-off.
                </li>
                <li className="flex gap-3 text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2.5 shrink-0" />
                  Please be available at the delivery location and keep your phone reachable.
                </li>
                <li className="flex gap-3 text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2.5 shrink-0" />
                  If we cannot complete delivery due to wrong details or no response, fees may still apply.
                </li>
              </ul>
            </section>

            {/* 6. Legal & Governing Law */}
            <section className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <Scale className="w-6 h-6 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-800">6. Governing Law</h2>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms are governed by the laws of <strong>Morocco</strong>. Any disputes will be handled by the competent courts in <strong>Laayoune, Morocco</strong>.
              </p>
            </section>

            {/* Contact Footer */}
            <section className="pt-10 border-t border-gray-100">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="bg-primary-100 p-3 rounded-full">
                    <Mail className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Contact Support</h3>
                    <p className="text-primary-600 font-medium hover:underline cursor-pointer">
                      habahaba@gmail.com
                    </p>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-sm text-gray-400 uppercase font-bold tracking-widest">
                    &copy; {new Date().getFullYear()} Haba Haba Business
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