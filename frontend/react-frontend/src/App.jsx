import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css'

// Pages
import Home from './assets/pages/home.jsx';
import Shop from './assets/pages/shop.jsx';
import Favorites from './assets/pages/favorites.jsx';
import Sell from './assets/pages/sell.jsx';
import Product from './assets/pages/product.jsx';


function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      {/* Routes */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/product/:id" element={<Product />} />

        {/* <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} /> */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
