import type { Operator } from '../lib/operator';
import { LegalPage, OperatorAddress } from './LegalPage';

export function Privacy({ operator }: { operator: Operator }) {
  const host = window.location.hostname;
  return (
    <LegalPage title="Privacybeleid">
      <p>
        Dit privacybeleid beschrijft hoe {host} (hierna: &ldquo;de tool&rdquo;) omgaat met persoonsgegevens.
        Met de tool importeer je creditcardtransacties uit een CSV-bestand in je eigen Moneybird-administratie. We
        hebben de tool zo gebouwd dat er zo weinig mogelijk gegevens worden verwerkt en dat we niets op onze server
        opslaan.
      </p>

      <h2>1. Wie is verantwoordelijk?</h2>
      <p>De verwerkingsverantwoordelijke in de zin van de Algemene verordening gegevensbescherming (AVG) is:</p>
      <OperatorAddress operator={operator} />

      <h2>2. Welke gegevens verwerken we en waarom?</h2>
      <h3>Koppeling met Moneybird</h3>
      <p>
        Als je de tool koppelt met Moneybird, geeft Moneybird ons een toegangstoken waarmee de tool namens jou
        toegang heeft tot bankgegevens en instellingen van je administratie. Dit token wordt versleuteld opgeslagen
        in een cookie in je eigen browser. We bewaren het token niet op onze server. Bij het ontkoppelen trekken we
        het token in bij Moneybird en verwijderen we de cookie.
      </p>
      <h3>CSV-bestand</h3>
      <p>
        Het CSV-bestand dat je uploadt, wordt uitsluitend in je browser ingelezen en verwerkt. Het bestand zelf wordt
        niet naar onze server verstuurd. Alleen de transacties die je selecteert en laat importeren (datum, bedrag en
        omschrijving) worden via onze server doorgestuurd naar Moneybird. Onze server slaat deze gegevens niet op.
      </p>
      <h3>Gegevens uit Moneybird</h3>
      <p>
        Om je de juiste administratie en rekening te laten kiezen en om dubbele transacties te herkennen, haalt de
        tool via onze server de namen van je administraties en rekeningen en de bestaande transacties uit de gekozen
        periode op bij Moneybird. Deze gegevens worden alleen aan jou getoond en gebruikt voor de controle op dubbele
        transacties; ze worden niet door ons opgeslagen.
      </p>
      <h3>Technische gegevens</h3>
      <p>
        Bij het bezoeken van de tool verwerkt onze hostingpartij technische gegevens zoals je IP-adres en
        browsergegevens. Dit is nodig om de website te leveren en te beveiligen, bijvoorbeeld tegen misbruik.
      </p>
      <h3>Grondslag</h3>
      <p>
        We verwerken deze gegevens omdat dit nodig is om de dienst te leveren die je gebruikt (uitvoering van een
        overeenkomst, artikel 6 lid 1 sub b AVG) en, voor technische gegevens en beveiliging, op basis van ons
        gerechtvaardigd belang bij een veilige en werkende dienst (artikel 6 lid 1 sub f AVG).
      </p>

      <h2>3. Cookies en lokale opslag</h2>
      <p>De tool gebruikt alleen functionele cookies die nodig zijn om de tool te laten werken:</p>
      <ul>
        <li><code>mb_session</code>: het versleutelde Moneybird-toegangstoken. Maximaal 30 dagen geldig.</li>
        <li><code>mb_oauth_state</code>: een eenmalige beveiligingscode tijdens het koppelen. Maximaal 10 minuten geldig.</li>
      </ul>
      <p>
        Daarnaast bewaart de tool in de lokale opslag (localStorage) van je browser je kolomkoppelingen, je taalkeuze
        en de laatst gekozen administratie en rekening, zodat je die niet steeds opnieuw hoeft in te stellen. Deze
        gegevens blijven op je eigen apparaat en kun je verwijderen door de websitegegevens in je browser te wissen.
      </p>
      <p>
        We gebruiken geen analytische cookies, tracking- of advertentiecookies en we plaatsen geen cookies van derden.
      </p>

      <h2>4. Met wie delen we gegevens?</h2>
      <ul>
        <li>
          <strong>Cloudflare</strong> host de tool en de server. Cloudflare treedt op als verwerker. Cloudflare kan
          gegevens verwerken buiten de Europese Economische Ruimte; doorgifte vindt plaats op basis van het
          EU-VS Data Privacy Framework en/of de standaardcontractbepalingen van de Europese Commissie.
        </li>
        <li>
          <strong>Moneybird</strong>: de transacties die je importeert, worden in je eigen Moneybird-administratie
          geplaatst. Voor de verwerking van gegevens in Moneybird geldt jouw eigen overeenkomst met Moneybird en het
          privacybeleid van Moneybird.
        </li>
      </ul>
      <p>We verkopen geen gegevens en delen ze niet met andere partijen, tenzij we daartoe wettelijk verplicht zijn.</p>

      <h2>5. Hoe lang bewaren we gegevens?</h2>
      <p>
        We slaan op onze server geen gegevens op over je administratie, je transacties of je CSV-bestand. De
        sessiecookie verloopt na maximaal 30 dagen of zodra je ontkoppelt. Technische gegevens bij onze hostingpartij
        worden alleen zo lang bewaard als nodig is voor levering en beveiliging van de dienst.
      </p>

      <h2>6. Beveiliging</h2>
      <p>
        Verbindingen met de tool zijn versleuteld (HTTPS). Het toegangstoken wordt versleuteld opgeslagen in een
        cookie die niet door scripts op de pagina kan worden uitgelezen. De tool vraagt bij Moneybird alleen toegang
        tot bankgegevens en instellingen.
      </p>

      <h2>7. Jouw rechten</h2>
      <p>
        Je hebt het recht op inzage, correctie en verwijdering van je persoonsgegevens, het recht op beperking van en
        bezwaar tegen de verwerking, en het recht op overdraagbaarheid van gegevens. Omdat we vrijwel geen gegevens op
        onze server bewaren, kun je de meeste gegevens zelf verwijderen door te ontkoppelen en je browsergegevens te
        wissen. Je kunt de toegang van de tool ook intrekken in je Moneybird-account.
      </p>
      <p>
        Voor vragen of verzoeken kun je mailen naar <a href={`mailto:${operator.email}`}>{operator.email}</a>. We
        reageren binnen een maand. Ben je het niet eens met hoe we met je gegevens omgaan, dan kun je een klacht
        indienen bij de <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noreferrer">Autoriteit Persoonsgegevens</a>.
      </p>

      <h2>8. Wijzigingen</h2>
      <p>
        We kunnen dit privacybeleid aanpassen, bijvoorbeeld als de tool verandert. De meest recente versie staat
        altijd op deze pagina, met de datum van de laatste wijziging bovenaan.
      </p>
    </LegalPage>
  );
}
