import { FaqContent } from '../components/FaqContent';
import { StaticPageShell } from '../components/StaticPageShell';

export default function FaqPage() {
  return (
    <StaticPageShell title="FAQ">
      <FaqContent />
    </StaticPageShell>
  );
}
