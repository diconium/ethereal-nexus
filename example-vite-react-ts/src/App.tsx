import './App.css';
import MyComponent from './components/ethereal-nexus/MyComponent/MyComponent.tsx';

import HelloWorld from './components/ethereal-nexus/HelloWorld/HelloWorld.tsx';
import Table from './components/ethereal-nexus/Table/Table.tsx';
import WKNDArticle from './components/ethereal-nexus/WKNDArticle/WKNDArticle.tsx';
import ChatGpt from './components/ethereal-nexus/ChatGpt/ChatGpt.tsx';
import Accordion from './components/ethereal-nexus/Accordion/Accordion.tsx';

function App() {
  return (
    <>
      <MyComponent
        name={'Rui'}
        image={
          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSqchnDJ6zreYOFN7Sag4iGQPEhjseY59SfQ-mf9bN2GpE8fcPXGGO3QC0YLVId0xw2zFU&usqp=CAU'
        }
        url={'/profile1'}
      ></MyComponent>
      <Table title={'Table'} description={'Lorem ipsum dolor'} />
      <HelloWorld title={'Ricardo'}></HelloWorld>
      <WKNDArticle
        title={'title'}
        description={'description'}
        imageAlt={'altImage'}
        imageurl={
          'https://slp-statics.astockcdn.net/static_assets/staging/23summer/home/EMEA/curated-collections/card-6.jpg?width=580&format=webp'
        }
        url={'#'}
      ></WKNDArticle>
      <ChatGpt></ChatGpt>
      <Accordion
        title={'My Accordion'}
        dataconfig={''}
        datapath={''}
        tabs={[]}
      ></Accordion>
    </>
  );
}

export default App;
