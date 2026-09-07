import { PrivacyPolicyContent } from '../components/PrivacyPolicyContent';
import { StaticPageShell } from '../components/StaticPageShell';

export default function PrivacyPage() {
  return (
    <StaticPageShell title="Privacy Policy">
      <PrivacyPolicyContent />
    </StaticPageShell>
  );
}
