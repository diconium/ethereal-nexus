import './App.css'

import NavigationBar from "./components/ethereal-nexus/NavigationBar/NavigationBar.tsx";
import HeroTeaser from "./components/ethereal-nexus/HeroTeaser/HeroTeaser.tsx";
import Title from "./components/ethereal-nexus/Title/Title.tsx";
import TextImage from "./components/ethereal-nexus/TextImage/TextImage.tsx";
import ContentTeaser from "./components/ethereal-nexus/ContentTeaser/ContentTeaser.tsx";
import CTA from "./components/ethereal-nexus/CTA/CTA.tsx";
import Footer from "./components/ethereal-nexus/Footer/Footer.tsx";
import Pricing from "./components/ethereal-nexus/Pricing/Pricing.tsx";

function App() {

    return (
        <>
            <NavigationBar/>
            <HeroTeaser></HeroTeaser>
            <Title></Title>
            <TextImage></TextImage>
            <ContentTeaser></ContentTeaser>
            <Pricing></Pricing>
            <CTA></CTA>
            <Footer></Footer>
        </>
    )
}

export default App;
