import Hero from "@/components/public/home/Hero";
import TelemetryGauges from "@/components/public/home/TelemetryGauges";
import Features from "@/components/public/home/Features";
import HowItWorks from "@/components/public/home/HowItWorks";
import FeaturedContent from "@/components/public/home/FeaturedContent";
import FaqSection from "@/components/public/home/FaqSection";
import CtaSection from "@/components/public/home/CtaSection";
import { ForceMotion } from "@/components/public/shared/motion";
import type { FeaturedBlog, FeaturedNews, FaqItem } from "@/components/public/home/types";

export default function HomePageClient({
  featuredBlog,
  featuredNews,
  faqs = [],
}: {
  featuredBlog?: FeaturedBlog | null;
  featuredNews?: FeaturedNews | null;
  faqs?: FaqItem[];
}) {
  return (
    // Every section animates even with "reduce motion" on — deliberate, see ForceMotion.
    <ForceMotion>
      <div className="bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <Hero featuredBlog={featuredBlog} featuredNews={featuredNews} />
        <TelemetryGauges />
        <Features />
        <HowItWorks />
        <FeaturedContent featuredBlog={featuredBlog} featuredNews={featuredNews} />
        <FaqSection faqs={faqs} />
        <CtaSection />
      </div>
    </ForceMotion>
  );
}
