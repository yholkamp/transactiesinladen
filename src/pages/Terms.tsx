import type { Operator } from '../lib/operator';
import { LegalPage, OperatorAddress } from './LegalPage';

export function Terms({ operator }: { operator: Operator }) {
  const host = window.location.hostname;
  return (
    <LegalPage title="Algemene voorwaarden">
      <h2>Artikel 1 — Aanbieder</h2>
      <p>De tool op {host} (hierna: &ldquo;de tool&rdquo;) wordt aangeboden door:</p>
      <OperatorAddress operator={operator} />

      <h2>Artikel 2 — Toepasselijkheid</h2>
      <p>
        Deze algemene voorwaarden zijn van toepassing op elk gebruik van de tool. Door de tool te gebruiken of te
        koppelen met Moneybird ga je akkoord met deze voorwaarden. Ga je niet akkoord, gebruik de tool dan niet.
      </p>

      <h2>Artikel 3 — De dienst</h2>
      <p>
        Met de tool kun je creditcardtransacties uit een CSV-bestand inlezen, controleren en als afschrift importeren
        in een rekening in je eigen Moneybird-administratie. Het gebruik van de tool is gratis.
      </p>
      <p>
        De tool is niet verbonden aan en wordt niet ondersteund door Moneybird B.V. &ldquo;Moneybird&rdquo; is een merk
        van Moneybird B.V. Voor het gebruik van Moneybird gelden de voorwaarden van Moneybird.
      </p>

      <h2>Artikel 4 — Geen garanties</h2>
      <p>
        De tool wordt aangeboden &ldquo;zoals hij is&rdquo; en &ldquo;zoals beschikbaar&rdquo;, zonder enige garantie,
        uitdrukkelijk of stilzwijgend. We garanderen niet dat de tool foutloos, ononderbroken, veilig of geschikt voor
        een bepaald doel is, of dat transacties juist, volledig of eenmalig worden ingelezen en geïmporteerd. We mogen
        de tool op elk moment wijzigen, tijdelijk buiten gebruik stellen of beëindigen, zonder voorafgaande
        aankondiging.
      </p>

      <h2>Artikel 5 — Jouw verantwoordelijkheid</h2>
      <ul>
        <li>
          Je bent zelf verantwoordelijk voor het controleren van de transacties voordat je ze importeert en voor het
          controleren van het resultaat in Moneybird, waaronder bedragen, datums, het teken (bij of af) en eventuele
          dubbele transacties.
        </li>
        <li>Je bent zelf verantwoordelijk voor je administratie, je boekhouding en je aangiftes.</li>
        <li>
          Je gebruikt de tool alleen voor administraties waarvoor je bevoegd bent, en je gebruikt de tool niet op een
          manier die de tool, Moneybird of anderen schade kan toebrengen.
        </li>
      </ul>

      <h2>Artikel 6 — Aansprakelijkheid</h2>
      <p>
        Voor zover wettelijk toegestaan is {operator.name} niet aansprakelijk voor enige schade die voortvloeit uit of
        verband houdt met het gebruik van, of het niet kunnen gebruiken van, de tool. Dit omvat onder meer schade door
        onjuist, onvolledig of dubbel geïmporteerde transacties, verlies van gegevens, gevolgschade, gederfde winst en
        boetes of naheffingen. Deze beperking geldt niet voor schade die het gevolg is van opzet of bewuste
        roekeloosheid van {operator.name}.
      </p>

      <h2>Artikel 7 — Privacy</h2>
      <p>
        Hoe we met persoonsgegevens omgaan, lees je in ons <a href="/privacy">privacybeleid</a>.
      </p>

      <h2>Artikel 8 — Intellectueel eigendom</h2>
      <p>
        De software van de tool is open source en beschikbaar onder de{' '}
        <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noreferrer">GNU Affero General Public License versie 3</a>.
        De gegevens die je met de tool verwerkt, blijven van jou.
      </p>

      <h2>Artikel 9 — Wijzigingen</h2>
      <p>
        We kunnen deze voorwaarden wijzigen. De meest recente versie staat altijd op deze pagina, met de datum van de
        laatste wijziging bovenaan. Door de tool na een wijziging te blijven gebruiken, ga je akkoord met de
        gewijzigde voorwaarden.
      </p>

      <h2>Artikel 10 — Toepasselijk recht en geschillen</h2>
      <p>
        Op deze voorwaarden en het gebruik van de tool is Nederlands recht van toepassing.{' '}
        {operator.court
          ? `Geschillen worden voorgelegd aan de bevoegde rechter van de rechtbank ${operator.court}, tenzij dwingend recht een andere rechter aanwijst.`
          : 'Geschillen worden voorgelegd aan de bevoegde Nederlandse rechter.'}
      </p>

      <h2>Artikel 11 — Contact</h2>
      <p>
        Vragen over deze voorwaarden of de tool? Mail naar <a href={`mailto:${operator.email}`}>{operator.email}</a>.
      </p>
    </LegalPage>
  );
}
