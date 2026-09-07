import { AboutPageContent } from '../components/AboutPageContent';
import { StaticPageShell } from '../components/StaticPageShell';

export default function AboutPage() {
  return (
    <StaticPageShell title="About">
      <AboutPageContent />
    </StaticPageShell>
  );
}
