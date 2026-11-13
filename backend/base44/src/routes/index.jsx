import { createFileRoute } from "@tanstack/react-router";
export const Route=createFileRoute("/")({component:Home});
function Home(){return <main style={{maxWidth:480,margin:"80px auto",padding:24,fontFamily:"system-ui"}}><h1>El meu mapa</h1><p>Aquest espai gestiona el teu compte i les còpies privades. Les escoles i les candidatures es consulten a la pàgina del mapa.</p><a href="https://dcarbonellcas-cmyk.github.io/el-meu-mapa/">Entrar al meu mapa</a></main>}
