import '../market/styles.css';
import { legalHtml, type LegalKind } from '../legal-content';

// The legal pages: the text and markup live in legal-content.ts, which the server also uses for its plain-HTML version.
export default function LegalPage({ kind }: { kind: LegalKind }) {
    return <div className="pp-legal-page" dangerouslySetInnerHTML={{ __html: legalHtml(kind) }} />;
}
