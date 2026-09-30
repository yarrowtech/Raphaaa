import React from 'react'
import Navbar from './Navbar'

const Header = ({ hideNavbarOnMobile = false }) => {
  return (
    <header className="">
      <div className={hideNavbarOnMobile ? "hidden lg:block" : ""}>
        <Navbar/>
      </div>
    </header>
  )
}

export default Header
