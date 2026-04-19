//import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css'

// Pages
import Home from './assets/pages/home.jsx';
import Shop from './assets/pages/shop.jsx';
import Favorites from './assets/pages/favorites.jsx';
import Sell from './assets/pages/sell.jsx';
import Product from './assets/pages/product.jsx';
import Search from './assets/pages/search.jsx';
import Messages from './assets/pages/messages.jsx';

//user stuff
import Login from './assets/pages/login.jsx';
import Signup from './assets/pages/signup.jsx';
import Profile from './assets/pages/profile.jsx';
import Cart from './assets/pages/cart.jsx';
import Checkout from './assets/pages/checkout.jsx';


function App() {
  //const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      {/* Routes */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/search" element={<Search />} />
        <Route path="/messages" element={<Messages />} />

        {/* user stuff */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/cart" element={<Cart />} />

        {/* checkout */}
        <Route path="/checkout" element={<Checkout />} />

        {/* <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} /> */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
