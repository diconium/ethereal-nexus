import './App.css'
import MyComponent from "./components/MyComponent.tsx";


import HelloWorld from "./components/HelloWorld.tsx";
import TableComponent from "./components/TableComponent.tsx";
import WKNDArticle from "./components/WKNDArticle.tsx";
import ChatGpt from "./components/ChatGpt.tsx";
import AccordionComponent from "./components/AccordionComponent.tsx";

function App() {

    return (
        <>
            <MyComponent name={"Rui"} image={"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSqchnDJ6zreYOFN7Sag4iGQPEhjseY59SfQ-mf9bN2GpE8fcPXGGO3QC0YLVId0xw2zFU&usqp=CAU"} url={"/profile1"}></MyComponent>
            <TableComponent title={"Table"} description={"Lorem ipsum dolor"}/>
            <HelloWorld title={"Ricardo"}></HelloWorld>
            <WKNDArticle title={"title"} description={"description"} imageAlt={"altImage"} imageurl={"https://slp-statics.astockcdn.net/static_assets/staging/23summer/home/EMEA/curated-collections/card-6.jpg?width=580&format=webp"} url={"#"}></WKNDArticle>
            <ChatGpt></ChatGpt>
            <AccordionComponent title={"My Accordion"} dataconfig={""} datapath={""} tabs={[]}></AccordionComponent>
        </>
    )
}

export default App
