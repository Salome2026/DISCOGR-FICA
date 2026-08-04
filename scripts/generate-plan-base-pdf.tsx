import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToFile } from "@react-pdf/renderer";

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
  coverTitle: { fontSize: 32, color: "#ffffff", fontFamily: "Helvetica-Bold", lineHeight: 1.15, marginBottom: 12 },
  coverSub: { fontSize: 12.5, color: "#b7bac2", lineHeight: 1.5, maxWidth: 400 },
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
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 7 },
  checkBox: { width: 11, height: 11, borderWidth: 1.3, borderColor: TEAL, borderRadius: 2, marginTop: 1 },
  checkText: { flex: 1, fontSize: 10, color: GRAY, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#9a9da8", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
});

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <View wrap={false} style={{ marginBottom: 4 }}>
      <Text style={styles.h1Num}>PARTE {num}</Text>
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

function Check({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.checkRow}>
      <View style={styles.checkBox} />
      <Text style={styles.checkText}>{children}</Text>
    </View>
  );
}

function Footer({ page }: { page: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Guía práctica de lanzamiento · VPO Corp</Text>
      <Text>{page}</Text>
    </View>
  );
}

const doc = (
  <Document title="Guía práctica para lanzar una canción — VPO Corp" author="VPO Corp">
    {/* Cover */}
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverInner}>
        <View>
          <Text style={styles.coverKicker}>VPO Corp · Guía de lanzamiento</Text>
          <View style={styles.coverBar} />
          <Text style={styles.coverTitle}>Cómo lanzar{"\n"}tu canción</Text>
          <Text style={styles.coverSub}>
            Una guía simple, paso a paso, para promocionar un lanzamiento sin necesidad de saber
            de marketing ni de gastar en publicidad. Pensada para empezar a aplicarse hoy mismo.
          </Text>
        </View>
        <Text style={styles.coverFooter}>Documento base · uso interno</Text>
      </View>
    </Page>

    {/* Parte 1: 15 días antes */}
    <Page size="A4" style={styles.page}>
      <Section num="01" title="Qué hacer los 15 días antes del lanzamiento">
        <Text style={styles.p}>
          Cuanto antes empieces a avisar que se viene un tema nuevo, más gente va a estar
          esperando escucharlo el día que salga. Estos 15 días son para generar esa expectativa.
        </Text>
        <Text style={styles.h2}>Activar el "guardado anticipado" (pre-save)</Text>
        <Text style={styles.p}>
          Spotify tiene una función que se llama "pre-save" (guardado anticipado): la gente puede
          guardar la canción en su biblioteca ANTES de que salga, y apenas se publica, les aparece
          automáticamente. Esto ayuda mucho a que Spotify empiece a recomendar el tema desde el
          primer día.
        </Text>
        <Bullet>Activá el guardado anticipado entre 10 y 14 días antes de la fecha de salida.</Bullet>
        <Bullet>Compartí el link para guardar la canción en la biografía de Instagram y en una Historia fija (destacada) durante toda la espera.</Bullet>
        <Bullet>Contale a tu gente por qué vale la pena guardarlo: "así te va a sonar apenas salga, sin tener que buscarlo".</Bullet>
        <Text style={styles.h2}>Avisar que se viene algo nuevo</Text>
        <Bullet>Publicá un video corto (7 a 15 segundos) contando que se viene un tema nuevo, con la fecha.</Bullet>
        <Bullet>Mostrá la portada del tema en un posteo.</Bullet>
        <Bullet>Subí contenido "detrás de escena": vos en el estudio, grabando, mezclando, eligiendo la portada.</Bullet>
        <Bullet>Compartí un fragmento cortito de la canción (10-15 segundos) unos días antes, sin mostrarla completa.</Bullet>
        <Bullet>Los últimos 2-3 días, hacé una cuenta regresiva en tus Historias.</Bullet>
      </Section>
      <Footer page="2" />
    </Page>

    {/* Parte 2: día del lanzamiento */}
    <Page size="A4" style={styles.page}>
      <Section num="02" title="Qué hacer el día del lanzamiento">
        <Text style={styles.p}>
          Este es el día más importante para hacer ruido. La idea es que en las primeras horas
          la mayor cantidad de gente posible escuche la canción y la comparta.
        </Text>
        <Bullet>Publicá el anuncio oficial en tu feed apenas salga el tema, con la portada y el link para escucharlo.</Bullet>
        <Bullet>Subí un video (Reel) mostrando el mejor fragmento de la canción, presentándola como recién salida.</Bullet>
        <Bullet>Contale a tu gente por Historias que ya está disponible, con un link directo para escucharla.</Bullet>
        <Bullet>Mandá el link por WhatsApp a tu familia, amigos y conocidos, pidiéndoles que la escuchen y la guarden.</Bullet>
        <Bullet>Pedile a las personas cercanas a vos (banda, equipo, amigos, otros artistas) que publiquen algo ese mismo día para sumar alcance desde el primer momento.</Bullet>
        <Bullet>Respondé todos los comentarios y mensajes que recibas ese día — mientras más rápido contestás, más se mueve la publicación.</Bullet>
      </Section>
      <Section num="03" title="Qué hacer los 30 días después">
        <Text style={styles.p}>
          El trabajo no termina el día del lanzamiento. Estos 30 días sirven para que la canción
          siga sumando escuchas en vez de quedar olvidada a la semana.
        </Text>
        <Bullet>Días 1 a 3: compartí las reacciones y comentarios de la gente sobre el tema.</Bullet>
        <Bullet>Día 5: subí un contenido distinto — una versión acústica, un freestyle, algo del detrás de escena del videoclip si hay.</Bullet>
        <Bullet>Día 10: proponé una dinámica simple para que la gente participe (un desafío, una consigna) usando la canción.</Bullet>
        <Bullet>Día 15: contá cómo va el tema — si entró a alguna playlist, si tuvo buena repercusión, agradecé el apoyo.</Bullet>
        <Bullet>Día 20: sumá una colaboración — un cover, un dueto, o que otro artista/creador haga contenido con tu canción.</Bullet>
        <Bullet>Día 30: hacé un cierre de ciclo agradeciendo a quienes acompañaron, y empezá a preparar el próximo lanzamiento.</Bullet>
      </Section>
      <Footer page="3" />
    </Page>

    {/* Parte 4: calendario semanal */}
    <Page size="A4" style={styles.page}>
      <Section num="04" title="Calendario semanal de contenido">
        <Text style={styles.p}>
          No hace falta publicar contenido distinto todos los días. Con un mismo tema podés armar
          varios posteos durante la semana, en distintos formatos.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lunes</Text>
          <Text style={styles.p}>Historia contando cómo estuvo el fin de semana / algo personal para conectar con la gente.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Martes / Miércoles</Text>
          <Text style={styles.p}>Un video (Reel/TikTok) con contenido nuevo relacionado a la canción.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Jueves</Text>
          <Text style={styles.p}>Historia interactiva: una pregunta, una encuesta, algo que invite a responder.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Viernes</Text>
          <Text style={styles.p}>Otro video, aprovechando que suele ser el día de mayor actividad en redes.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sábado / Domingo</Text>
          <Text style={styles.p}>Contenido más relajado: repostear lo que suban tus fans, mostrar tu día a día.</Text>
        </View>
        <Text style={[styles.p, { marginTop: 6 }]}>
          Un mismo video se puede subir a Instagram, TikTok y YouTube el mismo día — no hace falta
          grabar contenido distinto para cada plataforma.
        </Text>
      </Section>
      <Footer page="4" />
    </Page>

    {/* Parte 5-7: ideas por plataforma */}
    <Page size="A4" style={styles.page}>
      <Section num="05" title="Ideas de Reels para Instagram">
        <Bullet>Cantar o hacer playback del mejor pedazo de la canción, mirando a cámara, con buena luz.</Bullet>
        <Bullet>Mostrar el momento de escuchar la canción terminada por primera vez, con tu reacción real.</Bullet>
        <Bullet>Un "antes y después": del estudio grabando a la versión final ya lista.</Bullet>
        <Bullet>Contar en pocas palabras qué te inspiró a escribir la canción.</Bullet>
        <Bullet>Un cambio de ropa o de look que coincida con un momento fuerte de la canción.</Bullet>
      </Section>
      <Section num="06" title="Ideas de videos para TikTok">
        <Bullet>Proponer un baile o un gesto simple con el estribillo, fácil de copiar.</Bullet>
        <Bullet>Un video corto y gracioso que muestre lo que dice la letra de forma divertida.</Bullet>
        <Bullet>Grabar un video junto a otro creador usando la canción de fondo.</Bullet>
        <Bullet>Sumarte a algún formato que esté de moda esa semana, usando tu canción como música de fondo.</Bullet>
      </Section>
      <Section num="07" title="Ideas de Shorts para YouTube">
        <Bullet>Recortar el mejor momento del videoclip (si tenés) en formato vertical.</Bullet>
        <Bullet>Mostrar comentarios reales de la gente leídos en cámara.</Bullet>
        <Bullet>Un mini tutorial de cómo tocar o cantar el estribillo, si tiene sentido para tu estilo.</Bullet>
      </Section>
      <Footer page="5" />
    </Page>

    {/* Parte 8: historias */}
    <Page size="A4" style={styles.page}>
      <Section num="08" title="Ideas de historias para publicar todos los días">
        <Text style={styles.p}>
          Las Historias son gratis, rápidas de hacer, y ayudan a que la gente se acuerde de vos
          todos los días sin esfuerzo.
        </Text>
        <Bullet>Repostear cualquier cosa que suban tus fans sobre la canción.</Bullet>
        <Bullet>Una foto o video simple de tu día, con la canción sonando de fondo.</Bullet>
        <Bullet>Una encuesta: "¿Cuál es tu parte favorita de la canción?"</Bullet>
        <Bullet>Un dato curioso sobre cómo se hizo el tema.</Bullet>
        <Bullet>Mostrar cuántas veces sonó en algún lugar (un boliche, la radio, un evento).</Bullet>
        <Bullet>Recordar el link para escuchar o guardar la canción, sin miedo a repetirlo varias veces por semana.</Bullet>
      </Section>
      <Footer page="6" />
    </Page>

    {/* Parte 9-11: spotify, compartir, playlists */}
    <Page size="A4" style={styles.page}>
      <Section num="09" title="Cómo lograr que más personas guarden la canción en Spotify">
        <Text style={styles.p}>
          Cuantas más personas guardan una canción en su biblioteca, más la recomienda Spotify
          a otros oyentes parecidos.
        </Text>
        <Bullet>Pedilo directamente: "Guardala para no perderla" funciona mejor que no decir nada.</Bullet>
        <Bullet>Recordá el link para escuchar en varias Historias durante la primera semana, no solo el primer día.</Bullet>
        <Bullet>Pedile a la gente que la escuche completa, sin saltear — eso también ayuda a que Spotify la recomiende más.</Bullet>
      </Section>
      <Section num="10" title="Cómo conseguir que más personas compartan el lanzamiento">
        <Bullet>Decilo con todas las letras en el posteo: "Compartilo con alguien que le pueda gustar".</Bullet>
        <Bullet>Armá una imagen simple con una frase de la letra, pensada para que la gente la suba a sus Historias.</Bullet>
        <Bullet>Hacé una pregunta o encuesta relacionada a la canción — cuando alguien responde, es más fácil que después comparta.</Bullet>
        <Bullet>Ofrecé algo a cambio de compartir: acceso antes que nadie al próximo lanzamiento, o un sorteo simple entre quienes lo hagan.</Bullet>
      </Section>
      <Section num="11" title="Cómo acercar la canción a playlists, sin pagar nada">
        <Text style={styles.p}>
          Existen playlists armadas por personas comunes (no solo las oficiales de Spotify) que
          suman muchos oyentes si tu canción entra en ellas.
        </Text>
        <Bullet>Buscá playlists de tu mismo estilo musical que ya tengan bastantes seguidores.</Bullet>
        <Bullet>Escribile a quien arma esa playlist ofreciéndole la canción, con un mensaje corto contando quién sos.</Bullet>
        <Bullet>Hacelo con unos días de anticipación al lanzamiento, no el mismo día.</Bullet>
        <Bullet>Si te suman a una playlist, agradecé y compartila en tus Historias — eso ayuda a que sigan sumándote en el futuro.</Bullet>
      </Section>
      <Footer page="7" />
    </Page>

    {/* Parte 12-15: mantener vivo, celular, gratis, errores */}
    <Page size="A4" style={styles.page}>
      <Section num="12" title="Cómo mantener el lanzamiento activo varias semanas sin repetir siempre lo mismo">
        <Bullet>Semana 1: contenido de estreno — reacciones, primeras escuchas, agradecimientos.</Bullet>
        <Bullet>Semana 2: contenido detrás de escena — cómo se hizo, historias del proceso.</Bullet>
        <Bullet>Semana 3: contenido participativo — desafíos, encuestas, dinámicas con tus seguidores.</Bullet>
        <Bullet>Semana 4: contenido nuevo con la misma canción — una versión distinta, una colaboración, un video en vivo cantándola.</Bullet>
      </Section>
      <Section num="13" title="Ideas fáciles de grabar solo con el celular">
        <Bullet>Vos cantando o escuchando el tema en el auto, en tu casa, caminando.</Bullet>
        <Bullet>Una nota de voz o video contando una anécdota corta sobre la canción.</Bullet>
        <Bullet>Grabar la reacción de amigos o familia al escucharla por primera vez.</Bullet>
        <Bullet>Un video simple mirando a cámara, contando por qué la hiciste.</Bullet>
      </Section>
      <Section num="14" title="Acciones gratuitas que dan más alcance">
        <Bullet>Publicar seguido — mientras más contenido subís, más oportunidades tenés de que algo funcione.</Bullet>
        <Bullet>Responder todos los comentarios — eso hace que la publicación siga activa y llegue a más gente.</Bullet>
        <Bullet>Etiquetar a las personas que participaron en la canción (productor, featuring, sello).</Bullet>
        <Bullet>Usar el nombre de la canción y tu nombre de artista escritos igual en todos lados (redes, Spotify, YouTube) para que la gente te encuentre fácil.</Bullet>
      </Section>
      <Section num="15" title="Errores comunes que conviene evitar">
        <Bullet>Publicar todo el mismo día y después no subir nada más — el lanzamiento necesita seguimiento las semanas siguientes.</Bullet>
        <Bullet>No pedir directamente que guarden o compartan la canción, esperando que pase solo.</Bullet>
        <Bullet>Usar una portada de mala calidad o que no se lee bien en el celular.</Bullet>
        <Bullet>No avisar con anticipación — lanzar sin haber generado ninguna expectativa antes.</Bullet>
        <Bullet>Dejar de responder comentarios y mensajes después de los primeros días.</Bullet>
      </Section>
      <Footer page="8" />
    </Page>

    {/* Parte 16: checklist */}
    <Page size="A4" style={styles.page}>
      <Section num="16" title="Checklist final">
        <Text style={styles.p}>Repasá esta lista antes, durante y después del lanzamiento para no olvidarte de nada importante.</Text>
        <Text style={styles.h2}>Antes del lanzamiento</Text>
        <Check>Activé el guardado anticipado (pre-save) al menos 10 días antes.</Check>
        <Check>Avisé en mis redes que se viene un tema nuevo, con fecha.</Check>
        <Check>Compartí adelantos (fragmento, portada, detrás de escena).</Check>
        <Check>Le ofrecí la canción a playlists independientes de mi estilo.</Check>
        <Text style={styles.h2}>El día del lanzamiento</Text>
        <Check>Publiqué el anuncio oficial con el link para escuchar.</Check>
        <Check>Subí un Reel/video mostrando la canción.</Check>
        <Check>Mandé el link por WhatsApp a mi gente cercana.</Check>
        <Check>Le pedí a mi equipo/amigos que publicaran ese mismo día.</Check>
        <Text style={styles.h2}>Después del lanzamiento</Text>
        <Check>Seguí publicando contenido distinto durante las 4 semanas siguientes.</Check>
        <Check>Respondí comentarios y mensajes.</Check>
        <Check>Agradecí a quienes me sumaron a playlists o compartieron el tema.</Check>
        <Check>Empecé a preparar el próximo lanzamiento.</Check>
      </Section>
      <Footer page="9" />
    </Page>

    {/* Bonus: más ideas */}
    <Page size="A4" style={styles.page}>
      <Section num="17" title="Más ideas para potenciar el lanzamiento">
        <Text style={styles.p}>
          Estas son acciones opcionales, para quienes quieran ir un paso más allá del plan básico.
        </Text>
        <Bullet>Colaborar con otros creadores de contenido que hagan videos usando tu canción.</Bullet>
        <Bullet>Proponer dinámicas con tus seguidores: que manden sus videos cantando o bailando el tema.</Bullet>
        <Bullet>Hacer una transmisión en vivo cantando o hablando sobre la canción.</Bullet>
        <Bullet>Mostrar contenido detrás de escena que no mostraste antes: bocetos, primeras versiones, errores graciosos de grabación.</Bullet>
        <Bullet>Reutilizar un mismo video bueno en Instagram, TikTok y YouTube en distintos momentos, no solo una vez.</Bullet>
        <Bullet>Leer los comentarios y mensajes que te dejan y usarlos como base para nuevo contenido (responder en video, por ejemplo).</Bullet>
        <Bullet>Planificar contenido para extender el lanzamiento 1 o 2 meses más: nuevas versiones, remixes, videos en vivo, colaboraciones.</Bullet>
      </Section>
      <Footer page="10" />
    </Page>
  </Document>
);

renderToFile(doc, "public/plan-marketing-base.pdf").then(() => {
  console.log("PDF generado: public/plan-marketing-base.pdf");
});
