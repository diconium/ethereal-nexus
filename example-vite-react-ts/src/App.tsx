import './App.css'
import MyComponent from "./components/MyComponent.tsx";

import '@fontsource/inter';
import HelloWorld from "./components/HelloWorld.tsx";
import TableComponent from "./components/TableComponent.tsx";
import WKNDArticle from "./components/WKNDArticle.tsx";
import AccordionComponent from "./components/AccordionComponent.tsx";
import HeroTeaser from "./components/HeroTeaser.tsx";
import ContentCard from "./components/ContentCard.tsx";
import DatePicker from "@/components/Datepicker.tsx";

function App() {

    return (
        <>
            <MyComponent name={"Rui"} image={"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSqchnDJ6zreYOFN7Sag4iGQPEhjseY59SfQ-mf9bN2GpE8fcPXGGO3QC0YLVId0xw2zFU&usqp=CAU"} url={"/profile1"}></MyComponent>
            <TableComponent title={"Table"} description={"Lorem ipsum dolor"}/>
            <HelloWorld title={"Ricardo"}></HelloWorld>
            <DatePicker title={'this is a ttle'} description={'description'} datepickerColor={'red'}/>
            <WKNDArticle title={"title"} description={"description"} imageAlt={"altImage"} imageurl={"https://slp-statics.astockcdn.net/static_assets/staging/23summer/home/EMEA/curated-collections/card-6.jpg?width=580&format=webp"} url={"#"}></WKNDArticle>
            <AccordionComponent title={"My Accordion"} dataconfig={""} datapath={""} tabs={[]}></AccordionComponent>
            <ContentCard title={"Yosemite National Park"} subtitle={"April 24 to May 02, 2021"} alt={"bookmark Bahamas Islands"} cta={"#"} image={"https://images.unsplash.com/photo-1527549993586-dff825b37782?auto=format&fit=crop&w=286"} ctalabel={"Explore"} price={"$2,900"}></ContentCard>
            <HeroTeaser title={"A large headlinerer about our product features & services"} description={"A descriptive secondary text placeholder. Use it to explain your business\n" +
                "        offer better."} image={"https://images.unsplash.com/photo-1483791424735-e9ad0209eea2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=774&q=80"}></HeroTeaser>
        </>
    )
}

export default App
