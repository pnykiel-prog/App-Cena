// QuotePDF — server-rendered PDF za pomocą @react-pdf/renderer.
// Branding tenanta jako proste kolory (PDF nie obsługuje CSS vars).

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

export type QuotePdfData = {
  tenant: {
    name: string;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    brandColor: string;
    accentColor: string;
  };
  quote: {
    createdAt: string;
    barthelScore: number;
    careTierLabel: string | null;
    contractMonths: number;
    basePrice: number;
    careSurcharge: number;
    modifiersTotal: number;
    addonsTotal: number;
    discountPct: number;
    estimateMin: number;
    estimateMid: number;
    estimateMax: number;
    currency: string;
    roomLabel: string | null;
  };
  modifiers: { label: string; amount: number }[];
  addons: { label: string; monthlyEquivalent: number }[];
  shareUrl: string;
};

const fmtPLN = (v: number) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(v);

function barthelLabel(score: number): string {
  if (score <= 20) return "Pełna niesamodzielność";
  if (score <= 40) return "Znaczna niesamodzielność";
  if (score <= 60) return "Umiarkowana niesamodzielność";
  if (score <= 85) return "Niewielka niesamodzielność";
  return "Samodzielność";
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1f2937",
  },
  headerBar: {
    height: 6,
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontSize: 20,
    fontWeight: 700,
    marginRight: 12,
  },
  brandText: {
    flexGrow: 1,
  },
  tenantName: {
    fontSize: 14,
    fontWeight: 700,
  },
  tenantSub: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 2,
  },
  badge: {
    fontSize: 8,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 99,
    color: "white",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 18,
  },
  card: {
    padding: 14,
    borderRadius: 6,
    marginBottom: 16,
  },
  rangeBox: {
    color: "white",
    padding: 18,
    borderRadius: 6,
    marginBottom: 18,
    alignItems: "center",
  },
  rangeLabel: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    opacity: 0.8,
    marginBottom: 6,
  },
  rangeValue: {
    fontSize: 22,
    fontWeight: 700,
  },
  rangeMeta: {
    fontSize: 9,
    opacity: 0.8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  rowSub: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
    paddingLeft: 12,
  },
  rowLabel: {
    fontSize: 10,
  },
  rowLabelSub: {
    fontSize: 9,
    color: "#6b7280",
  },
  rowValue: {
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginTop: 6,
    marginBottom: 6,
  },
  midRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  midLabel: {
    fontSize: 11,
    fontWeight: 700,
  },
  contactBlock: {
    padding: 14,
    borderRadius: 6,
    border: "1pt solid #e5e7eb",
    marginBottom: 16,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
});

export function QuotePDF({ data }: { data: QuotePdfData }) {
  const { tenant, quote, modifiers, addons } = data;
  const interp = barthelLabel(quote.barthelScore);
  const dateStr = new Date(quote.createdAt).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const discountAmount =
    (quote.basePrice +
      quote.careSurcharge +
      quote.modifiersTotal +
      quote.addonsTotal) *
    quote.discountPct;

  return (
    <Document title={`Wycena pobytu — ${tenant.name}`} author="CareQuote">
      <Page size="A4" style={styles.page}>
        <View
          style={[
            styles.headerBar,
            { backgroundColor: tenant.brandColor },
          ]}
        />

        <View style={styles.brandRow}>
          <View
            style={[
              styles.logoBox,
              { backgroundColor: tenant.brandColor },
            ]}
          >
            <Text>{tenant.name.charAt(0)}</Text>
          </View>
          <View style={styles.brandText}>
            <Text style={styles.tenantName}>{tenant.name}</Text>
            <Text style={styles.tenantSub}>
              {tenant.city ?? ""}
              {tenant.address ? ` · ${tenant.address}` : ""}
              {tenant.phone ? ` · tel. ${tenant.phone}` : ""}
            </Text>
          </View>
          <Text
            style={[
              styles.badge,
              { backgroundColor: tenant.accentColor },
            ]}
          >
            WSTĘPNA WYCENA
          </Text>
        </View>

        <Text style={[styles.title, { color: tenant.brandColor }]}>
          Wstępna wycena pobytu w domu seniora
        </Text>
        <Text style={styles.subtitle}>
          Wycena z {dateStr} · pobyt {quote.contractMonths} mies.
        </Text>

        <View
          style={[
            styles.rangeBox,
            { backgroundColor: tenant.brandColor },
          ]}
        >
          <Text style={styles.rangeLabel}>SZACUNKOWY KOSZT MIESIĘCZNY</Text>
          <Text style={styles.rangeValue}>
            {fmtPLN(quote.estimateMin)} – {fmtPLN(quote.estimateMax)}
          </Text>
          <Text style={styles.rangeMeta}>
            {quote.currency} / miesiąc · środek {fmtPLN(quote.estimateMid)}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: tenant.brandColor }]}>
          Szczegóły wyceny
        </Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Pokój — {quote.roomLabel ?? "—"}</Text>
          <Text style={styles.rowValue}>{fmtPLN(quote.basePrice)}</Text>
        </View>
        {quote.careTierLabel ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              Opieka — {quote.careTierLabel} (Barthel {quote.barthelScore}/100)
            </Text>
            <Text style={styles.rowValue}>{fmtPLN(quote.careSurcharge)}</Text>
          </View>
        ) : null}

        {modifiers.length > 0 ? (
          <>
            <View style={{ marginTop: 6 }}>
              <Text style={styles.rowLabelSub}>Modyfikatory medyczne:</Text>
            </View>
            {modifiers.map((m, i) => (
              <View style={styles.rowSub} key={i}>
                <Text style={styles.rowLabelSub}>• {m.label}</Text>
                <Text style={styles.rowValue}>{fmtPLN(m.amount)}</Text>
              </View>
            ))}
          </>
        ) : null}

        {addons.length > 0 ? (
          <>
            <View style={{ marginTop: 6 }}>
              <Text style={styles.rowLabelSub}>
                Usługi dodatkowe (ekwiwalent miesięczny):
              </Text>
            </View>
            {addons.map((a, i) => (
              <View style={styles.rowSub} key={i}>
                <Text style={styles.rowLabelSub}>• {a.label}</Text>
                <Text style={styles.rowValue}>
                  {fmtPLN(a.monthlyEquivalent)}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {quote.discountPct > 0 ? (
          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={[styles.rowLabel, { color: tenant.accentColor }]}>
              Rabat za umowę {quote.contractMonths} mies. (
              {(quote.discountPct * 100).toFixed(0)}%)
            </Text>
            <Text style={[styles.rowValue, { color: tenant.accentColor }]}>
              − {fmtPLN(discountAmount)}
            </Text>
          </View>
        ) : null}

        <View style={styles.midRow}>
          <Text style={[styles.midLabel, { color: tenant.brandColor }]}>
            Środek widełek
          </Text>
          <Text style={styles.midLabel}>
            {fmtPLN(quote.estimateMid)} / mies.
          </Text>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={[styles.sectionTitle, { color: tenant.brandColor }]}>
            Interpretacja oceny
          </Text>
          <Text>
            Skala Barthela: {quote.barthelScore}/100 pkt — {interp}.
          </Text>
        </View>

        <View style={[styles.contactBlock, { marginTop: 18 }]}>
          <Text style={[styles.sectionTitle, { color: tenant.brandColor }]}>
            Kontakt z placówką
          </Text>
          <Text>{tenant.name}</Text>
          {tenant.address || tenant.city ? (
            <Text>
              {tenant.postalCode ? `${tenant.postalCode} ` : ""}
              {tenant.city ?? ""}
              {tenant.address ? `, ${tenant.address}` : ""}
            </Text>
          ) : null}
          {tenant.phone ? <Text>Tel: {tenant.phone}</Text> : null}
          {tenant.email ? <Text>E-mail: {tenant.email}</Text> : null}
          {tenant.website ? <Text>{tenant.website}</Text> : null}
          <Text style={{ marginTop: 8, fontSize: 9, color: "#6b7280" }}>
            Skopiuj link aby otworzyć tę wycenę online: {data.shareUrl}
          </Text>
        </View>

        <Text style={styles.footer}>
          Wycena ma charakter wstępny i niewiążący. Ostateczna kwota zostaje
          ustalona po konsultacji z placówką. · Wycena generowana przez
          CareQuote.
        </Text>
      </Page>
    </Document>
  );
}
