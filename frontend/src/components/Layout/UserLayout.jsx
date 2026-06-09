import React from 'react'
import Header from '../Common/Header'
import Footer from '../Common/Footer'
import { Outlet, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import ScrollToTopButton from '../Common/ScrollToTopButton'
import WhatsAppWidget from '../Common/WhatsAppWidget'
import ExitIntentPopup from '../Common/ExitIntentPopup'
import MobileFooterNav from './MobileFooterNav'
import { fetchCart } from '../../redux/slices/cartSlice'

const UserLayout = () => {
  const dispatch = useDispatch()
  const { user, guestId } = useSelector((state) => state.auth)
  const location = useLocation()
  const isOrderDetailsPage = /^\/order\/[^/]+$/.test(location.pathname)
  const isCheckoutPage = location.pathname === "/checkout"
  const isCollectionsPage = location.pathname === "/collections/all"
  const isWishlistPage = location.pathname === "/wishlist"
  const isRecentlyViewedPage = location.pathname === "/recently-viewed"
  const isMyActivityPage = location.pathname === "/my-activity"
  const isSettingsPage = location.pathname === "/settings"
  const isUpdateProfilePage = location.pathname === "/update-profile"
  const hideMobileFooterMenu = isCheckoutPage
  const hideNavbarOnMobile = location.pathname === "/profile" || isRecentlyViewedPage || isMyActivityPage || isSettingsPage || isUpdateProfilePage
  const hideFooterOnMobileRoutes = [
    "/profile",
    "/login",
    "/register",
    "/forgot-password",
    "/checkout",
    "/cart",
  ]
  const hideFooterOnMobile = hideFooterOnMobileRoutes.includes(location.pathname) || isOrderDetailsPage || isRecentlyViewedPage || isMyActivityPage
  const hideFooterOnMobileOnly = isSettingsPage || isUpdateProfilePage
  const isHomePage = location.pathname === "/"
  const hideTopbarOnMobile = !isHomePage || isRecentlyViewedPage || isMyActivityPage || isSettingsPage || isUpdateProfilePage

  React.useEffect(() => {
    if (user?._id) {
      dispatch(fetchCart({ userId: user._id }))
      return
    }
    if (guestId) {
      dispatch(fetchCart({ guestId }))
    }
  }, [dispatch, user?._id, guestId])

  return (
    <>
      <div
        className={
          isCollectionsPage
            ? "hidden lg:block"
            : isCheckoutPage || isWishlistPage || isRecentlyViewedPage || isMyActivityPage
              ? "hidden"
              : ""
        }
      >
        <Header
          hideTopbarOnMobile={hideTopbarOnMobile}
          hideNavbarOnMobile={hideNavbarOnMobile}
        />
      </div>
      <main className={hideMobileFooterMenu ? "pb-0" : "pb-20 lg:pb-0"}>
        <Outlet/>
      </main>
      <div
        className={
          isCollectionsPage
            ? "hidden"
            : isWishlistPage || isRecentlyViewedPage || isMyActivityPage || hideFooterOnMobile
              ? "hidden"
              : hideFooterOnMobileOnly
                ? "hidden lg:block"
                : ""
        }
      >
        <Footer/>
      </div>
      {!hideMobileFooterMenu && <MobileFooterNav />}
      <div className="hidden lg:block">
        <ScrollToTopButton/>
      </div>
      <WhatsAppWidget />
      <ExitIntentPopup />
    </>
  )
}

export default UserLayout
