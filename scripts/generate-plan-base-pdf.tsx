import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToFile, Font } from "@react-pdf/renderer";

const TEAL = "#2a8c94";
const INK = "#15161a";
const GRAY = "#5a5d68";
const LIGHT = "#eef0f2";
const LINE = "#dcdfe3";

const styles = StyleSheet.create({
  page: { padding: "48 44 56", fontSize: 10.5, fontFamily: "Helvetica", color: INK, lineHeight: 1.45 },
  coverPage: { padding: 0, backgroundColor: INK },
  coverInner: { flex: 1, padding: 56, justifyContent: "space-between" },
  coverKicker: { fontSize: 11, color: TEAL, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 },
  coverTitle: { fontSize: 34, color: "#ffffff", fontFamily: "Helvetica-Bold", lineHeight: 1.15, marginBottom: 12 },
  coverSub: { fontSize: 12.5, color: "#b7bac2", lineHeight: 1.5, maxWidth: 380 },
  coverFooter: { fontSize: 9.5, color: "#8b8e97" },
  coverBar: { width: 46, height: 4, backgroundColor: TEAL, marginBottom: 22 },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 4 },
  h1Num: { fontSize: 10, color: TEAL, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, marginBottom: 6 },
  h1Rule: { height: 2, backgroundColor: TEAL, width: 28, marginBottom: 16, marginTop: 2 },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", color: INK, marginTop: 14, marginBottom: 6 },
  p: { fontSize: 10, color: GRAY, marginBottom: 8, lineHeight: 1.5 },
  bullet: { flexDirection: "row", marginBottom: 5, paddingRight: 4 },
  bulletDot: { width: 10, fontSize: 10, color: TEAL, fontFamily: "Helvetica-Bold" },
  bulletText: { flex: 1, fontSize: 10, color: GRAY, lineHeight: 1.45 },
  card: { backgroundColor: LIGHT, borderRadius: 4, padding: 12, marginBottom: 10 },
  cardTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 4 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 6 },
  rowHead: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: INK, paddingVertical: 6 },
  colDay: { width: 90, fontSize: 9.5, fontFamily: "Helvetica-Bold", color: TEAL },
  colDesc: { flex: 1, fontSize: 9.5, color: GRAY },
  colHeadText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: INK, textTransform: "uppercase", letterSpacing: 0.5 },
  kpiRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 7 },
  kpiName: { width: 170, fontSize: 9.5, fontFamily: "Helvetica-Bold", color: INK },
  kpiTarget: { width: 140, fontSize: 9.5, color: TEAL },
  kpiFreq: { flex: 1, fontSize: 9.5, color: GRAY },
  footer: { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#9a9da8", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
});

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <View wrap={false} style={{ marginBottom: 4 }}>
      <Text style={styles.h1Num}>SECCIÓN {num}</Text>
      <Text style={styles.h1}>{title}</Text>
      <View style={styles.h1Rule} />
      {children}
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function Footer({ page }: { page: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Playbook de Marketing Orgánico · VPO Corp</Text>
      <Text>{page}</Text>
    </View>
  );
}

const doc = (
  <Document title="Plan de Marketing Orgánico — Playbook de Lanzamiento" author="VPO Corp">
    {/* Cover */}
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverInner}>
        <View>
          <Text style={styles.coverKicker}>VPO Corp · Playbook de lanzamiento</Text>
          <View style={styles.coverBar} />
          <Text style={styles.coverTitle}>Plan de Marketing{"\n"}Orgánico</Text>
          <Text style={styles.coverSub}>
            Estrategia base para el lanzamiento de un fonograma: pre-save, cronograma, contenidos,
            playlisting y KPIs. Aplicable a la mayoría de los lanzamientos del sello, listo para
            ejecutar sin depender de presupuesto de pauta.
          </Text>
        </View>
        <Text style={styles.coverFooter}>Documento base · uso interno</Text>
      </View>
    </Page>

    {/* Section 1: Pre-save */}
    <Page size="A4" style={styles.page}>
      <Section num="01" title="Estrategia de Pre-Save">
        <Text style={styles.p}>
          El pre-save arranca el algoritmo de Spotify antes del día 0: cada guardado anticipado cuenta
          como señal de intención de escucha apenas se libera el tema, lo que ayuda a activar Release
          Radar y las colas algorítmicas de los primeros seguidores.
        </Text>
        <Text style={styles.h2}>Cuándo activarlo</Text>
        <Bullet>Abrir el pre-save 10 a 14 días antes del lanzamiento — antes pierde urgencia, después no da tiempo a acumular volumen.</Bullet>
        <Bullet>Cerrar la campaña de pre-save el día del lanzamiento a las 00:00 (hora ART), coincidiendo con la salida real del tema.</Bullet>
        <Text style={styles.h2}>Cómo comunicarlo</Text>
        <Bullet>Link único (Linkfire, Feature.fm o similar) que combine pre-save + preview de audio + portada.</Bullet>
        <Bullet>Publicar el link en bio 10 días antes y renovarlo con un Story fijado (Highlights) durante toda la previa.</Bullet>
        <Bullet>Un Reel de teaser (7-15 seg) el día que se abre el pre-save, con el link como único CTA.</Bullet>
        <Bullet>Recordatorio en Stories cada 2-3 días con countdown sticker nativo de Instagram.</Bullet>
        <Text style={styles.h2}>Incentivo para guardar</Text>
        <Bullet>Ofrecer algo exclusivo a quien haga pre-save: adelanto de 5-8 seg inédito, o sorteo de merch/entradas entre quienes comenten "LISTO" en el post de aviso.</Bullet>
      </Section>
    </Page>

    {/* Section 2: Cronograma */}
    <Page size="A4" style={styles.page}>
      <Section num="02" title="Cronograma: -15 días a +30 días">
        <Text style={styles.p}>
          Línea de tiempo estándar. Los días son orientativos — se puede comprimir a 7 días de previa
          si el lanzamiento se define con poca anticipación, pero el orden de las acciones se mantiene.
        </Text>
        <View style={styles.rowHead}>
          <Text style={[styles.colHeadText, { width: 90 }]}>Momento</Text>
          <Text style={styles.colHeadText}>Acción</Text>
        </View>
        {[
          ["Día -15", "Definir portada final, cronograma de contenido y assets (audio preview, foto de prensa, lyric snippet)."],
          ["Día -14", "Abrir pre-save. Post de anuncio en feed con fecha, portada y featuring (si hay)."],
          ["Día -12", "Primer Reel de proceso creativo / detrás de escena en el estudio."],
          ["Día -10", "Envío a curadores de playlists editoriales (Spotify for Artists) y playlists independientes afines al género."],
          ["Día -7", "Reel con fragmento del tema (15-20 seg del mejor momento, no el intro)."],
          ["Día -5", "TikTok con el hook/estribillo pensado para sonido viral, sin mostrar el tema completo."],
          ["Día -3", "Countdown en Stories + recordatorio de pre-save con testimonios/reacciones de allegados."],
          ["Día -1", "Teaser final + Story con cuenta regresiva de 24hs."],
          ["Día 0", "Lanzamiento. Post principal en feed, Reel de estreno, Story con link directo a escuchar, WhatsApp/Broadcast a base propia."],
          ["Día +1 a +3", "Reels de reacciones/comentarios del público, repost de contenido de fans, primeras estadísticas si son positivas."],
          ["Día +5", "Nuevo corte de contenido: versión acústica, freestyle, o detrás de cámara del videoclip si existe."],
          ["Día +10", "TikTok con challenge o dinámica participativa usando el audio del tema."],
          ["Día +15", "Balance parcial: repostear playlists donde entró, mencionar hitos (streams, posiciones)."],
          ["Día +20", "Colaboración con otro artista/creador para remix, cover o dueto usando el audio."],
          ["Día +30", "Cierre de ciclo: recap en Reel, agradecimiento a la comunidad, transición al siguiente lanzamiento."],
        ].map(([day, desc]) => (
          <View style={styles.row} key={day}>
            <Text style={styles.colDay}>{day}</Text>
            <Text style={styles.colDesc}>{desc}</Text>
          </View>
        ))}
      </Section>
      <Footer page="2" />
    </Page>

    {/* Section 3: Calendario de contenidos */}
    <Page size="A4" style={styles.page}>
      <Section num="03" title="Calendario de Contenidos">
        <Text style={styles.p}>
          Ritmo de publicación recomendado durante las 6 semanas que rodean el lanzamiento (3 previas + 3 posteriores).
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instagram</Text>
          <Bullet>3-4 Reels por semana (mínimo 1 diario en la semana del lanzamiento).</Bullet>
          <Bullet>Stories todos los días: mezcla de contenido propio, reposts y encuestas/preguntas para sostener interacción.</Bullet>
          <Bullet>1 post de feed estático por semana (portada, flyer de fecha, foto de prensa).</Bullet>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TikTok</Text>
          <Bullet>1 video diario mínimo durante la semana de lanzamiento; 4-5 por semana el resto del ciclo.</Bullet>
          <Bullet>Priorizar variaciones del mismo audio: distintos ángulos, distintos creadores, distintos contextos.</Bullet>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>YouTube Shorts</Text>
          <Bullet>2-3 por semana, reutilizando los mejores clips verticales ya producidos para Reels/TikTok (mismo asset, tres plataformas).</Bullet>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Regla general de reciclaje</Text>
          <Bullet>Cada pieza de contenido se adapta a las 3 plataformas el mismo día — no se produce contenido exclusivo por plataforma salvo que el formato lo requiera.</Bullet>
        </View>
      </Section>
      <Footer page="3" />
    </Page>

    {/* Section 4-6: Ideas de contenido */}
    <Page size="A4" style={styles.page}>
      <Section num="04" title="Ideas de Reels">
        <Bullet>Lip-sync directo del artista al mejor verso/estribillo, plano cerrado, buena luz, sin distracciones de fondo.</Bullet>
        <Bullet>"Antes / después": del estudio grabando a la versión final mezclada, con el momento de escuchar el master por primera vez.</Bullet>
        <Bullet>Reacción genuina de la familia, banda o equipo al escuchar el tema terminado.</Bullet>
        <Bullet>Detrás de cámara del videoclip o de la sesión de fotos de portada.</Bullet>
        <Bullet>Storytime hablado sobre qué inspiró la canción, cortado con el fragmento correspondiente.</Bullet>
        <Bullet>Transición de vestuario/look sincronizada con un cambio fuerte en la producción del tema.</Bullet>
      </Section>
      <Section num="05" title="Ideas de TikToks">
        <Bullet>Reto de baile o gesto simple asociado al estribillo, fácil de repetir por cualquiera.</Bullet>
        <Bullet>POV corto (5-8 seg) que dramatice la letra de forma cómica o relatable.</Bullet>
        <Bullet>Duetos/Stitch con fans o creadores medianos del género que ya generan contenido con temas similares.</Bullet>
        <Bullet>"Rating" del tema en formato humorístico: reacción exagerada tipo streamer.</Bullet>
        <Bullet>Uso del audio como fondo de un formato tendencia del momento (adaptar según lo que esté viral esa semana).</Bullet>
      </Section>
      <Section num="06" title="Ideas de Shorts (YouTube)">
        <Bullet>Versión vertical del mejor fragmento del videoclip oficial, con texto quemado del título.</Bullet>
        <Bullet>Compilado de reacciones de comentarios reales de Instagram/TikTok leídos en cámara.</Bullet>
        <Bullet>Mini-tutorial: cómo tocar/cantar el estribillo, si aplica al género (guitarra, coros, pasos de baile).</Bullet>
      </Section>
      <Footer page="4" />
    </Page>

    {/* Section 7: Spotify */}
    <Page size="A4" style={styles.page}>
      <Section num="07" title="Estrategias para Spotify">
        <Text style={styles.h2}>Spotify for Artists</Text>
        <Bullet>Enviar el tema a curadores editoriales con mínimo 7 días de anticipación (cuanto antes, mejor prioridad).</Bullet>
        <Bullet>Completar Canvas (video loop de 8 seg) — mejora retención y tasa de guardado en el reproductor.</Bullet>
        <Bullet>Activar Marquee (si hay presupuesto) apenas se detecte tracción orgánica temprana, no antes.</Bullet>
        <Bullet>Actualizar biografía del artista y foto de perfil coincidiendo con la estética del lanzamiento.</Bullet>
        <Text style={styles.h2}>Playlists algorítmicas</Text>
        <Bullet>Release Radar y Discover Weekly se activan con pre-saves y con escuchas completas (no skips) en los primeros días — pedir a la base de fans que escuche el tema entero, no solo el inicio.</Bullet>
        <Bullet>Radio/Daily Mix mejora cuando el tema comparte oyentes con artistas similares — colaborar o aparecer en playlists de artistas del mismo género ayuda indirectamente.</Bullet>
        <Text style={styles.h2}>Señales que le importan al algoritmo</Text>
        <Bullet>Guardar en biblioteca, agregar a playlist propia, y escuchar completo pesan más que un play suelto.</Bullet>
        <Bullet>Pedir explícitamente estas acciones en el copy del post de lanzamiento suma — no asumir que el oyente sabe qué hacer.</Bullet>
      </Section>
      <Footer page="5" />
    </Page>

    {/* Section 8-10: UGC, saves/shares, playlists */}
    <Page size="A4" style={styles.page}>
      <Section num="08" title="Cómo generar UGC (contenido de usuarios)">
        <Bullet>Lanzar el audio como sonido "usable" en Reels/TikTok desde el día 0, con el nombre del artista visible en el sonido.</Bullet>
        <Bullet>Proponer una dinámica simple y replicable (challenge, filtro, transición) en el primer post — cuanto más fácil de copiar, más UGC genera.</Bullet>
        <Bullet>Repostear activamente todo contenido de fans en Stories durante las primeras 2 semanas — la visibilidad de "me repostearon" incentiva a más gente a participar.</Bullet>
        <Bullet>Activar a la red cercana (banda, equipo, sello, artistas amigos) para publicar el mismo día del lanzamiento y así generar el primer impulso de contenido.</Bullet>
      </Section>
      <Section num="09" title="Cómo incentivar guardados y compartidos">
        <Bullet>Pedir explícitamente en el copy: "Guardalo para no perderlo" — la instrucción directa aumenta la tasa de guardado más que dejarlo implícito.</Bullet>
        <Bullet>Diseñar al menos una pieza "compartible" por naturaleza: una frase de la letra en formato cita visual, pensada para Stories con el sticker de reshare.</Bullet>
        <Bullet>Crear una encuesta o pregunta en Stories relacionada al tema (ej. "¿Cuál es tu frase favorita?") — la interacción invita a compartir la respuesta.</Bullet>
        <Bullet>Ofrecer valor adicional a quien comparte: acceso anticipado a próximo lanzamiento, sorteo de merch, shoutout en Stories.</Bullet>
      </Section>
      <Section num="10" title="Cómo conseguir playlists orgánicas">
        <Bullet>Mapear playlists independientes del género (no editoriales de Spotify) con buen volumen de seguidores y contactar directamente a sus curadores.</Bullet>
        <Bullet>Priorizar playlists que ya incluyan artistas similares del sello o del género — mayor probabilidad de aceptación y de compartir audiencia real.</Bullet>
        <Bullet>Ofrecer el tema con al menos 5-7 días de anticipación junto con nota de prensa breve (artista, género, contexto del lanzamiento).</Bullet>
        <Bullet>Hacer seguimiento post-inclusión: agradecer, compartir la playlist en Stories, mantener la relación para futuros lanzamientos.</Bullet>
      </Section>
      <Footer page="6" />
    </Page>

    {/* Section 11: KPIs */}
    <Page size="A4" style={styles.page}>
      <Section num="11" title="KPIs Recomendados">
        <Text style={styles.p}>
          Métricas a monitorear durante los primeros 30 días. Los rangos son orientativos para un
          lanzamiento estándar sin pauta paga — sirven como referencia de "va bien" / "hay que ajustar".
        </Text>
        <View style={styles.rowHead}>
          <Text style={[styles.colHeadText, { width: 170 }]}>Métrica</Text>
          <Text style={[styles.colHeadText, { width: 140 }]}>Objetivo orientativo</Text>
          <Text style={styles.colHeadText}>Frecuencia</Text>
        </View>
        {[
          ["Guardados en biblioteca", "≥ 15-20% de los oyentes", "Semanal"],
          ["Escuchas completas (no skip)", "≥ 60% del total de streams", "Semanal"],
          ["Adiciones a playlists propias", "Crecimiento sostenido semana a semana", "Semanal"],
          ["Alcance de Reels/TikTok", "Al menos 1 pieza supera 3x el alcance promedio", "Cada publicación"],
          ["Tasa de guardado en Reels", "≥ 5% de las reproducciones", "Cada publicación"],
          ["Nuevos seguidores netos", "Pico visible la semana del lanzamiento", "Semanal"],
          ["Playlists orgánicas conseguidas", "Mínimo 3-5 en los primeros 30 días", "Cada 15 días"],
          ["Oyentes mensuales (Spotify)", "Crecimiento vs. el mes anterior al lanzamiento", "Mensual"],
        ].map(([name, target, freq]) => (
          <View style={styles.kpiRow} key={name}>
            <Text style={styles.kpiName}>{name}</Text>
            <Text style={styles.kpiTarget}>{target}</Text>
            <Text style={styles.kpiFreq}>{freq}</Text>
          </View>
        ))}
        <Text style={[styles.p, { marginTop: 14 }]}>
          Si a los 15 días varias métricas están muy por debajo del objetivo, es el momento de ajustar
          estrategia (cambiar el corte de contenido destacado, revisar el copy, o considerar sumar
          presupuesto de pauta puntual) en vez de esperar a que el ciclo natural del lanzamiento se agote.
        </Text>
      </Section>
      <Footer page="7" />
    </Page>
  </Document>
);

renderToFile(doc, "public/plan-marketing-base.pdf").then(() => {
  console.log("PDF generado: public/plan-marketing-base.pdf");
});
