import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import UserLayout from "./components/Layout/UserLayout";
const Home = lazy(() => import("./pages/Home"));
import { Toaster } from "sonner";
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const RecentlyViewed = lazy(() => import("./pages/RecentlyViewed"));
const Settings = lazy(() => import("./pages/Settings"));
const MyActivity = lazy(() => import("./pages/MyActivity"));
const ExclusiveDrop = lazy(() => import("./pages/ExclusiveDrop"));
const DropDetail = lazy(() => import("./pages/DropDetail"));
const CollectionPage = lazy(() => import("./pages/CollectionPage"));
const ProductDetails = lazy(() => import("./components/Products/ProductDetails"));
const Checkout = lazy(() => import("./components/Cart/Checkout"));
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmationPage"));
const OrderDetailsPage = lazy(() => import("./pages/OrderDetailsPage"));
const MyOrders = lazy(() => import("./pages/MyOrdersPage"));
const MyPrebookings = lazy(() => import("./pages/MyPrebookings"));
const AdminPrebookings = lazy(() => import("./pages/AdminPrebookings"));
const AdminLayout = lazy(() => import("./components/Admin/AdminLayout"));
const AdminHomePage = lazy(() => import("./pages/AdminHomePage"));
const UserManagement = lazy(() => import("./components/Admin/UserManagement"));
const MobileLogins = lazy(() => import("./components/Admin/MobileLogins"));
const ProductManagement = lazy(() => import("./components/Admin/ProductManagement"));
const EditProductPage = lazy(() => import("./components/Admin/EditProductPage"));
const OrderManagement = lazy(() => import("./components/Admin/OrderManagement"));
import { Provider } from "react-redux";
import store from "./redux/store";
import ProtectedRoute from "./components/Common/ProtectedRoute";
import SiteTracker from "./components/Common/SiteTracker";
const ButtonAnalytics = lazy(() => import("./pages/ButtonAnalytics"));
const AddProduct = lazy(() => import("./components/Admin/AddProduct"));
const About = lazy(() => import("./components/Common/About"));
const Contact = lazy(() => import("./components/Common/Contact"));
const PrivacyPolicy = lazy(() => import("./components/Common/PrivacyPolicy"));
const LegalPage = lazy(() => import("./components/Common/LegalPage"));
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const SubmitReview = lazy(() => import("./pages/SubmitReview"));
const SubmitReviewFromOrder = lazy(() => import("./pages/SubmitReviewFromOrder"));
const UpdateProfile = lazy(() => import("./pages/UpdateProfile"));
const ReviewForm = lazy(() => import("./pages/ReviewForm"));
const CreateTask = lazy(() => import("./pages/CreateTask"));
const ViewTasks = lazy(() => import("./pages/ViewTasks"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const SalesTrendsPage = lazy(() => import("./pages/SalesTrendsPage"));
const RevenueReport = lazy(() => import("./pages/RevenueReport"));
const RegisterDeliveryBoy = lazy(() => import("./pages/RegisterDeliveryBoy"));
const ViewContacts = lazy(() => import("./pages/ViewContacts"));
const HeroSettings = lazy(() => import("./pages/HeroSettings"));
const AdminContactSettings = lazy(() => import("./pages/AdminContactSettings"));
import ScrollToTop from "./components/Common/ScrollToTop";
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const AdminCollabSettings = lazy(() => import("./pages/AdminCollabSettings"));
const AdminCollabPreview = lazy(() => import("./pages/AdminCollabPreview"));
const EditCollab = lazy(() => import("./pages/EditCollab"));
const AdminAboutSettings = lazy(() => import("./pages/AdminAboutSettings"));
const PrivacyPolicySettings = lazy(() => import("./pages/PrivacyPolicySettings"));
const AddEditOffer = lazy(() => import("./pages/AddEditOffer"));
const AdminOffersList = lazy(() => import("./pages/AdminOffersList"));
const AddEditCoupon = lazy(() => import("./pages/AddEditCoupon"));
const AdminCouponsList = lazy(() => import("./pages/AdminCouponsList"));
const OffersShowcase = lazy(() => import("./pages/OffersShowcase"));
const VerifyMobile = lazy(() => import("./pages/VerifyMobile"));
import AutoLogout from "./components/Common/AutoLogout";
const ViewSubscribers = lazy(() => import("./pages/ViewSubscribers"));
const AddMetaOption = lazy(() => import("./components/Admin/AddMetaOption"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UserHierarchy = lazy(() => import("./pages/UserHierarchy"));
const CampaignTracker = lazy(() => import("./pages/CampaignTracker"));
const MarketingBroadcast = lazy(() => import("./pages/MarketingBroadcast"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ResetPasswordUser = lazy(() => import("./pages/ResetPasswordUser"));
const AdminSizeCharts = lazy(() => import("./pages/AdminSizeCharts"));
const AdminShippingSettings = lazy(() => import("./pages/AdminShippingSettings"));
const AdminLegalSettings = lazy(() => import("./pages/AdminLegalSettings"));
const ReferAndEarn = lazy(() => import("./pages/ReferAndEarn"));
const AdminReturnsManagement = lazy(() => import("./pages/AdminReturnsManagement"));
import {
  captureAttribution,
  rememberCampaignClick,
  trackCampaignLanding,
  trackCampaignImpression,
} from "./utils/attribution";
// const AdminAboutSettings = lazy(() => import("./pages/AdminAboutSettings"));

const App = () => {
  useEffect(() => {
    captureAttribution();
    rememberCampaignClick();
    trackCampaignLanding().catch(() => {});
    trackCampaignImpression();


  }, []);

  return (
    <Provider store={store}>
      <ToastContainer position="top-right" autoClose={2000} />
      <Toaster position="top-right" duration={2000} />
      <BrowserRouter>
        <AutoLogout />
        <ScrollToTop />
        <SiteTracker />
        <Suspense fallback={<div role="status" className="p-8 text-center">Loading page…</div>}>
        <Routes>
          <Route path="/" element={<UserLayout />}>
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="profile" element={<Profile />} />
            <Route
              path="wishlist"
              element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              }
            />
            <Route path="recently-viewed" element={<RecentlyViewed />} />
            <Route path="settings" element={<Settings />} />
            <Route path="update-profile" element={<Settings initialView="profile" />} />
            <Route
              path="my-activity"
              element={
                <ProtectedRoute>
                  <MyActivity />
                </ProtectedRoute>
              }
            />
            <Route
              path="collections/:collection"
              element={<CollectionPage />}
            />
            <Route path="product/:slug" element={<ProductDetails />} />
            <Route path="product/:slug/p/:sku" element={<ProductDetails />} />
            <Route path="cart" element={<Checkout />} />
            <Route path="checkout" element={<Checkout />} />
            <Route
              path="order-confirmation"
              element={<OrderConfirmationPage />}
            />
            <Route path="order/:id" element={<OrderDetailsPage />} />
            <Route path="/my-orders" element={
              <div className="min-h-screen py-8">
                <div className="max-w-3xl mx-auto px-4">
                  <MyOrders />
                </div>
              </div>
            } />
            <Route
              path="/prebookings"
              element={
                <ProtectedRoute>
                  <MyPrebookings />
                </ProtectedRoute>
              }
            />
            <Route path="/about" element={<About />} />
            <Route path="/contact-us" element={<Contact />} />
            <Route path="/refer"               element={<ReferAndEarn />} />
            <Route path="/privacy-policy"      element={<PrivacyPolicy />} />
            <Route path="/terms"               element={<LegalPage type="terms" />} />
            <Route path="/shipping-policy"     element={<LegalPage type="shipping-policy" />} />
            <Route path="/return-policy"       element={<LegalPage type="return-policy" />} />
            <Route path="/cancellation-policy" element={<LegalPage type="cancellation-policy" />} />
            <Route path="/review" element={<ReviewForm />} />
            <Route path="/review/:productId" element={<ReviewForm />} />
            <Route
              path="/register-delivery"
              element={<RegisterDeliveryBoy />}
            />
            {/* <Route path="/review-order/:orderId" element={<SubmitReviewFromOrder />} /> */}

            {/* extra added */}
            <Route path="/exclusive-drop" element={<ExclusiveDrop />} />
            <Route path="/exclusive-drop/:slug" element={<DropDetail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPasswordUser />} />
            <Route path="/offers" element={<OffersShowcase />} />
            <Route path="/verify-mobile" element={<VerifyMobile />} />

            {/* User Layout */}
          </Route>

          {/* <Route path="/admin" element={<AdminLayout/>}/> */}
          {/* Admin Layout */}
          {/* <Route path="/admin" element={<AdminLayout/>}>
            <Route index element={<ProtectedRoute role="admin"> <AdminHomePage/> </ProtectedRoute>} />
            <Route path="users" element={<UserManagement/>}/>
            <Route path="products" element={<ProductManagement/>}/>
            <Route path="products/:id/edit" element={<EditProductPage/>}/>
            <Route path="orders" element={<OrderManagement/>}/>
            <Route path="add-product" element={<AddProduct/> }/>
            <Route path="update-profile" element={<UpdateProfile/> }/>
          </Route> */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route
              index
              element={
                <ProtectedRoute role={["admin", "merchantise", "marketing"]}>
                  <AdminHomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="add-task"
              element={
                <ProtectedRoute role={["merchantise"]}>
                  <CreateTask />
                </ProtectedRoute>
              }
            />
            <Route
              path="view-tasks"
              element={
                <ProtectedRoute role={["merchantise"]}>
                  <ViewTasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="all-tasks"
              element={
                <ProtectedRoute role={["admin"]}>
                  <ViewTasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="inventory"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <InventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="trend-analysis"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <SalesTrendsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="revenue"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <RevenueReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="mobile-logins"
              element={
                <ProtectedRoute role={["admin"]}>
                  <MobileLogins />
                </ProtectedRoute>
              }
            />
            <Route
              path="reset-password"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <ResetPassword />
                </ProtectedRoute>
              }
            />
            <Route
              path="products"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <ProductManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="prebookings"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <AdminPrebookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="collab-settings"
              element={
                <ProtectedRoute role={["admin", "merchantise", "marketing"]}>
                  <AdminCollabSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="collabs"
              element={
                <ProtectedRoute role={["admin", "merchantise", "marketing"]}>
                  <AdminCollabPreview />
                </ProtectedRoute>
              }
            />
            <Route
              path="edit-collab/:id"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <EditCollab />
                </ProtectedRoute>
              }
            />
            <Route
              path="products/:id/edit"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <EditProductPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders"
              element={
                <ProtectedRoute role={["admin", "merchantise", "delivery_boy"]}>
                  <OrderManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="returns"
              element={
                <ProtectedRoute role={["admin", "merchantise", "marketing"]}>
                  <AdminReturnsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="add-product"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <AddProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="create-offers"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <AddEditOffer />
                </ProtectedRoute>
              }
            />
            <Route
              path="offers"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <AdminOffersList />
                </ProtectedRoute>
              }
            />
            <Route
              path="edit-offer/:id"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <AddEditOffer />
                </ProtectedRoute>
              }
            />
            <Route
              path="create-coupon"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <AddEditCoupon />
                </ProtectedRoute>
              }
            />
            <Route
              path="coupons"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <AdminCouponsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="edit-coupon/:id"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <AddEditCoupon />
                </ProtectedRoute>
              }
            />

            <Route
              path="contact-messages"
              element={
                <ProtectedRoute role={["admin", "merchantise", "marketing"]}>
                  <ViewContacts />
                </ProtectedRoute>
              }
            />
            <Route
              path="website-settings/hero"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <HeroSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="website-settings/about"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <AdminAboutSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="website-settings/privacy&policy"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <PrivacyPolicySettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="website-settings/contact"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <AdminContactSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="update-profile"
              element={
                <ProtectedRoute role={["admin", "merchantise", "delivery_boy", "marketing"]}>
                  <UpdateProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="subscribed-users"
              element={
                <ProtectedRoute role={["admin", "merchantise", "marketing"]}>
                  <ViewSubscribers/>
                </ProtectedRoute>
              }
            />
            <Route
              path="email-scheduler"
              element={
                <ProtectedRoute role={["admin", "merchantise", "marketing"]}>
                  <MarketingBroadcast />
                </ProtectedRoute>
              }
            />
            <Route
              path="custom-categories"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <AddMetaOption/>
                </ProtectedRoute>
              }
            />
            <Route
              path="hierarchy"
              element={
                <ProtectedRoute role={["admin", "merchantise", "marketing"]}>
                  <UserHierarchy/>
                </ProtectedRoute>
              }
            />
            <Route
              path="custom-categories"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <AddMetaOption/>
                </ProtectedRoute>
              }
            />
            <Route
              path="campaigns"
              element={
                <ProtectedRoute role={["admin", "marketing"]}>
                  <CampaignTracker/>
                </ProtectedRoute>
              }
            />
            <Route
              path="button-analytics"
              element={
                <ProtectedRoute role={["admin", "marketing"]}>
                  <ButtonAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="size-charts"
              element={
                <ProtectedRoute role={["admin", "merchantise"]}>
                  <AdminSizeCharts />
                </ProtectedRoute>
              }
            />
            <Route
              path="shipping-settings"
              element={
                <ProtectedRoute role={["admin"]}>
                  <AdminShippingSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="legal-settings"
              element={
                <ProtectedRoute role={["admin"]}>
                  <AdminLegalSettings />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </Provider>
  );
};

export default App;
