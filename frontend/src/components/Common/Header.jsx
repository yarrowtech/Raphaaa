import React from 'react'
import Topbar from '../Layout/Topbar'
import Navbar from './Navbar'

const Header = ({ hideTopbarOnMobile = false, hideNavbarOnMobile = false }) => {
  return (
    <header className="">
      <div className={hideTopbarOnMobile ? "hidden lg:block" : ""}>
        <Topbar/>
      </div>
      <div className={hideNavbarOnMobile ? "hidden lg:block" : ""}>
        <Navbar/>
      </div>
    </header>
  )
}

export default Header
