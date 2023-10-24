import './App.css'

import NavigationBar from "./components/ethereal-nexus/NavigationBar/NavigationBar.tsx";
import HeroTeaser from "./components/ethereal-nexus/HeroTeaser/HeroTeaserProps.tsx";
import Title from "./components/ethereal-nexus/Title/TitleProps.tsx";
import TextImage from "./components/ethereal-nexus/TextImage/TextImage.tsx";
import ContentTeaser from "./components/ethereal-nexus/ContentTeaser/ContentTeaserProps.tsx";
import CTA from "./components/ethereal-nexus/CTA/CTAProps.tsx";
import Footer from "./components/ethereal-nexus/Footer/FooterProps.tsx";
import Pricing from "./components/ethereal-nexus/Pricing/Pricing.tsx";

function App() {

    return (
        <>
            <NavigationBar title={'title'} cta={'cta'} ctaredirect={'https://www.google.com'} logo={'image.png'}/>
            <HeroTeaser headline={'this is a headline'} caption={'This is a caption'} ctaredirect={'http://www.google.com'} cta={'this is acta'} image={'image.png'} subheadline={'this is a subheadline'}></HeroTeaser>
            <Title title={'this is a title'}></Title>
            <TextImage image={'https://picsum.photos/200'} title={'title'} subtitle={'this is a subtitle'}></TextImage>
            <ContentTeaser cta={'This is a cta'} ctaredirect={'redirect'} caption={'This is a caption'} headline={'This ia a headline'} description={'This is a description, and another description, more description'}></ContentTeaser>
            <Pricing></Pricing>
            <CTA cta={'Call to Action'} headline={'Headline'} subheadline={'This is a sub headline'} ctaredirect={'cta redirect'}></CTA>
            <Footer></Footer>
        </>
    )
}

export default App;
