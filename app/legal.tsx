import './market/styles.css';
import { legalHtml, type LegalKind } from './legal-content';

// One template for both editions: the text and markup live in legal-content.ts.
export default function LegalPage({ kind }: { kind: LegalKind }) {
    return <div className="pp-legal-page" dangerouslySetInnerHTML={{ __html: legalHtml(kind) }} />;
}
