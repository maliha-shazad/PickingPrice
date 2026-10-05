import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Actions, Item, api, useLoad } from './ui';
import { sampleRequests } from '../samples';

// SVG Icons mapped explicitly to avoid lucide-react resolution issues
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const IconX = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const IconCamera = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>;
const IconSearch = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const IconMapPin = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const IconShieldCheck = ({ size = 12 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>;
const IconTag = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;

const SubIcon = ({ name }: { name: string }) => {
  const Svg = ({ children }: any) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
  switch(name) {
    // Clothes
    case 'Eastern Formals & Bridal': return <Svg><path d="M12 2L9 5h6L12 2z M9 5v5h6V5 M5 10h14v12H5z"></path></Svg>;
    case 'Casual Pret & Kurti': return <Svg><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"></path></Svg>;
    case 'Western Wear & Gowns': return <Svg><path d="M9 3h6v4H9z M6 7h12v4l-3 11H9l-3-11z"></path></Svg>;
    case 'Footwear & Khussas': return <Svg><path d="M4 16v-2.38C4 11.5 5.11 9.52 7 8v0a2 2 0 012-2h4a2 2 0 012 2v0c1.89 1.52 3 3.5 3 5.62V16 M4 16h16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4z"></path></Svg>;
    case 'Activewear & Gym': return <Svg><path d="M7 4h10 M7 20h10 M4 8h16v8H4z"></path></Svg>;
    case 'Sleepwear & Loungewear': return <Svg><path d="M4 12a8 8 0 0 1 16 0 M12 4v8 M12 20v-2"></path></Svg>;
    
    // Electronics
    case 'Smartphones': return <Svg><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></Svg>;
    case 'Laptops & Computers': return <Svg><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></Svg>;
    case 'Audio & Headphones': return <Svg><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></Svg>;
    case 'Gaming Consoles': return <Svg><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"></path></Svg>;
    case 'Smartwatches': return <Svg><rect x="6" y="6" width="12" height="12" rx="3"></rect><path d="M8 2v4 M16 2v4 M8 18v4 M16 18v4"></path></Svg>;
    case 'Tablets & E-Readers': return <Svg><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></Svg>;
    
    // Furniture
    case 'Living Room Sets': return <Svg><path d="M20 9V5a2 2 0 00-2-2H6a2 2 0 00-2 2v4 M4 9h16v8a2 2 0 01-2 2H6a2 2 0 01-2-2V9z M10 21v-2 M14 21v-2"></path></Svg>;
    case 'Bedroom Furniture': return <Svg><path d="M2 4v16M22 4v16M2 8h20M2 17h20M6 8v9M18 8v9"></path></Svg>;
    case 'Office Desks & Chairs': return <Svg><path d="M4 6h16M4 10h16M7 6v8M17 6v8M6 14h12v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zM10 20v2M14 20v2"></path></Svg>;
    case 'Dining Tables': return <Svg><path d="M2 16V8a2 2 0 012-2h16a2 2 0 012 2v8M6 6v14M18 6v14"></path></Svg>;
    case 'Storage & Wardrobes': return <Svg><rect x="4" y="2" width="16" height="20" rx="1"></rect><line x1="12" y1="2" x2="12" y2="22"></line><circle cx="10" cy="12" r="1"></circle><circle cx="14" cy="12" r="1"></circle></Svg>;
    case 'Outdoor Furniture': return <Svg><path d="M4 12h16 M6 12v8 M18 12v8 M10 12v4 M14 12v4 M8 12V8a4 4 0 0 1 8 0v4"></path></Svg>;
    
    // Sports
    case 'Gym Equipment': return <Svg><path d="M14.4 14.4l3.6 3.6 M5.6 5.6l3.6 3.6 M16.2 9.8l1.8 1.8a2.5 2.5 0 010 3.6l-3.6 3.6a2.5 2.5 0 01-3.6 0l-1.8-1.8 M2 14a2.5 2.5 0 000 3.6l3.6 3.6a2.5 2.5 0 003.6 0l1.8-1.8 M9.8 16.2l-1.8-1.8 M2 10a2.5 2.5 0 010-3.6l3.6-3.6a2.5 2.5 0 013.6 0l1.8 1.8"></path></Svg>;
    case 'Cricket Gear': return <Svg><path d="M14 14l6-6M8 20L2 14M22 2l-8 8M14 10l-4 4M22 22l-6-6M10 14l-4 4"></path></Svg>;
    case 'Football & Apparel': return <Svg><circle cx="12" cy="12" r="10"></circle><path d="M12 12l3.5-2M12 12l-3.5-2M12 12v4 M12 2 L12 12 M2 12 L12 12"></path></Svg>;
    case 'Outdoor & Camping': return <Svg><path d="M12 2L2 22h20L12 2z M12 22V12"></path></Svg>;
    case 'Fitness Accessories': return <Svg><rect x="6" y="8" width="12" height="8" rx="2"></rect><circle cx="12" cy="12" r="2"></circle></Svg>;
    case 'Tennis & Rackets': return <Svg><circle cx="12" cy="8" r="5"></circle><line x1="12" y1="13" x2="12" y2="22"></line><line x1="9" y1="18" x2="15" y2="18"></line></Svg>;
    
    // Books
    case 'Fiction & Literature': return <Svg><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></Svg>;
    case 'Academic & Textbooks': return <Svg><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z M10 2v8l3-3 3 3V2"></path></Svg>;
    case 'Self-Help': return <Svg><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path><path d="M12 8c-1-1-3-1-3 1 0 1 3 3 3 3s3-2 3-3c0-2-2-2-3-1z" fill="currentColor"></path></Svg>;
    case 'Childrens Books': return <Svg><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z M8 10h.01 M16 10h.01 M10 14c.5.5 1.5.5 2 0"></path></Svg>;
    case 'Biographies': return <Svg><path d="M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h4"></path></Svg>;
    case 'Cookbooks': return <Svg><path d="M4 4h16v16H4z M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"></path></Svg>;
    
    // Cameras
    case 'DSLR & Mirrorless': return <Svg><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></Svg>;
    case 'Lenses': return <Svg><rect x="5" y="4" width="14" height="16" rx="2"></rect><line x1="5" y1="8" x2="19" y2="8"></line><line x1="5" y1="16" x2="19" y2="16"></line></Svg>;
    case 'Drones & Action Cams': return <Svg><path d="M4 6h3 M17 6h3 M12 2v2 M12 20v2 M6 4l2 2 M18 4l-2 2 M6 20l2-2 M18 20l-2-2 M10 12h4v2h-4z"></path><circle cx="12" cy="12" r="4"></circle></Svg>;
    case 'Studio Equipment': return <Svg><path d="M12 2l-4 4h8z M12 6v16 M8 22h8 M6 10l6 4 6-4"></path></Svg>;
    case 'Lighting & Flashes': return <Svg><circle cx="12" cy="8" r="4"></circle><line x1="12" y1="12" x2="12" y2="22"></line><line x1="8" y1="22" x2="16" y2="22"></line></Svg>;
    case 'Tripods & Mounts': return <Svg><line x1="12" y1="4" x2="12" y2="8"></line><line x1="12" y1="8" x2="6" y2="20"></line><line x1="12" y1="8" x2="18" y2="20"></line><line x1="12" y1="8" x2="12" y2="20"></line></Svg>;
    
    // Automobiles
    case 'Car Accessories': return <Svg><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="15" x2="12" y2="22"></line><line x1="9.5" y1="10.5" x2="3.5" y2="6.5"></line><line x1="14.5" y1="10.5" x2="20.5" y2="6.5"></line></Svg>;
    case 'Motorbike Parts': return <Svg><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="12" y1="2" x2="12" y2="8"></line><line x1="12" y1="16" x2="12" y2="22"></line><line x1="2" y1="12" x2="8" y2="12"></line><line x1="16" y1="12" x2="22" y2="12"></line></Svg>;
    case 'Electronics & Audio': return <Svg><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="8" cy="12" r="3"></circle><circle cx="16" cy="12" r="3"></circle></Svg>;
    case 'Helmets': return <Svg><path d="M12 2a10 10 0 0 0-10 10v6h20v-6a10 10 0 0 0-10-10z"></path><path d="M2 12h20"></path><path d="M8 12v6"></path><path d="M16 12v6"></path></Svg>;
    case 'Car Cleaning': return <Svg><circle cx="12" cy="12" r="6"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line></Svg>;
    case 'Tools & Garage': return <Svg><path d="M14 6l6 6 M14 6L6 14a2.83 2.83 0 0 0 4 4l8-8z"></path></Svg>;
    
    // Kitchen
    case 'Small Appliances': return <Svg><rect x="4" y="8" width="16" height="12" rx="2"></rect><path d="M8 8V4h8v4"></path><circle cx="8" cy="14" r="2"></circle><line x1="14" y1="14" x2="16" y2="14"></line></Svg>;
    case 'Cookware Sets': return <Svg><path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"></path><path d="M2 10h20"></path><path d="M9 4h6v4H9z"></path></Svg>;
    case 'Dining & Serving': return <Svg><circle cx="12" cy="12" r="8"></circle><path d="M2 12h4 M18 12h4"></path></Svg>;
    case 'Storage Containers': return <Svg><rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M4 6h16 M6 4h12v2H6z"></path></Svg>;
    case 'Bakeware': return <Svg><rect x="4" y="8" width="16" height="8" rx="2"></rect><line x1="4" y1="12" x2="20" y2="12"></line></Svg>;
    case 'Cutlery & Knives': return <Svg><path d="M12 2l-2 12h4z M12 14v8"></path></Svg>;
    
    // Jewelry
    case 'Necklaces & Pendants': return <Svg><path d="M7 2v2a5 5 0 0 0 10 0V2 M12 10l2 4-2 4-2-4z"></path></Svg>;
    case 'Earrings & Rings': return <Svg><circle cx="12" cy="14" r="6"></circle><path d="M10 8l2-4 2 4z"></path></Svg>;
    case 'Bracelets': return <Svg><circle cx="12" cy="12" r="8" strokeDasharray="4 2"></circle></Svg>;
    case 'Luxury Watches': return <Svg><circle cx="12" cy="12" r="7"></circle><path d="M9 5L10 2h4l1 3 M9 19l1 3h4l1-3 M12 8v4l2 2"></path></Svg>;
    case 'Wedding Sets': return <Svg><circle cx="9" cy="12" r="4"></circle><circle cx="15" cy="12" r="4"></circle></Svg>;
    case 'Mens Jewelry': return <Svg><rect x="6" y="8" width="12" height="8" rx="1"></rect><line x1="12" y1="8" x2="12" y2="16"></line></Svg>;
    
    // Kids
    case 'Toys & Games': return <Svg><circle cx="12" cy="12" r="6"></circle><circle cx="6" cy="6" r="3"></circle><circle cx="18" cy="6" r="3"></circle><circle cx="12" cy="14" r="2"></circle></Svg>;
    case 'Baby Clothing': return <Svg><path d="M7 2l-4 4 2 2 2-2v14h10V6l2 2 2-2-4-4z M10 22v-4h4v4"></path></Svg>;
    case 'Strollers & Gear': return <Svg><path d="M4 4h4l2 12 M10 16h8 M15 6h4 M18 6l-2 10 M8 20a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M16 20a2 2 0 1 0 4 0 2 2 0 1 0-4 0"></path></Svg>;
    case 'Nursery Furniture': return <Svg><rect x="3" y="8" width="18" height="12" rx="1"></rect><line x1="3" y1="4" x2="3" y2="22"></line><line x1="21" y1="4" x2="21" y2="22"></line><line x1="7" y1="8" x2="7" y2="20"></line><line x1="11" y1="8" x2="11" y2="20"></line><line x1="15" y1="8" x2="15" y2="20"></line></Svg>;
    case 'School Supplies': return <Svg><path d="M4 20h16 M6 20V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14 M12 10v4"></path></Svg>;
    case 'Kids Footwear': return <Svg><path d="M6 16v-2c0-2 2-4 4-4h4c2 0 4 2 4 4v2 M6 16h12v4H6z"></path></Svg>;
    
    // Art
    case 'Paints & Canvases': return <Svg><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.16-.6-1.58-.33-.36-.55-.86-.55-1.42 0-1.1.9-2 2-2h1.65c2.97 0 5.5-2.47 5.5-5.5C22 6.48 17.52 2 12 2z M8 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm4-3a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm4 3a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path></Svg>;
    case 'Craft Supplies': return <Svg><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></Svg>;
    case 'Sketching Tools': return <Svg><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></Svg>;
    case 'Easels & Brushes': return <Svg><path d="M21 3l-6 6 M21 3a2.828 2.828 0 0 0-4-4L6 10l4 4L21 3z M6 10l-4 8 4 4 8-4-8-8z"></path></Svg>;
    case 'Digital Art Tablets': return <Svg><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="6" y1="20" x2="18" y2="20"></line></Svg>;
    case 'Sculpture & Modeling': return <Svg><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="17" x2="12" y2="22"></line><line x1="8" y1="22" x2="16" y2="22"></line></Svg>;
    
    // Accessories
    case 'Bags & Purses': return <Svg><path d="M8 8V6a4 4 0 0 1 8 0v2"></path><rect x="4" y="8" width="16" height="12" rx="2"></rect></Svg>;
    case 'Belts': return <Svg><rect x="2" y="10" width="20" height="4" rx="1"></rect><rect x="8" y="8" width="4" height="8" rx="1"></rect><circle cx="15" cy="12" r="1"></circle></Svg>;
    case 'Hats & Caps': return <Svg><path d="M4 14a8 8 0 0 1 16 0 M2 14h20 M12 6v2"></path></Svg>;
    case 'Sunglasses': return <Svg><rect x="2" y="12" width="8" height="6" rx="2"></rect><rect x="14" y="12" width="8" height="6" rx="2"></rect><path d="M10 14h4 M2 12L4 6 M22 12L20 6"></path></Svg>;
    case 'Scarves & Wraps': return <Svg><path d="M6 6c0-2 2-4 6-4s6 2 6 4v12H6z M12 6v12"></path></Svg>;
    case 'Umbrellas & Rainwear': return <Svg><path d="M12 2a10 10 0 0 0-10 10h20A10 10 0 0 0 12 2z M12 12v8a2 2 0 0 0 4 0"></path></Svg>;
    
    default: return <IconCheck />;
  }
};

const subCategories: Record<string, string[]> = {
  Clothes: ['Eastern Formals & Bridal', 'Casual Pret & Kurti', 'Western Wear & Gowns', 'Footwear & Khussas', 'Activewear & Gym', 'Sleepwear & Loungewear'],
  Electronics: ['Smartphones', 'Laptops & Computers', 'Audio & Headphones', 'Gaming Consoles', 'Smartwatches', 'Tablets & E-Readers'],
  Furniture: ['Living Room Sets', 'Bedroom Furniture', 'Office Desks & Chairs', 'Dining Tables', 'Storage & Wardrobes', 'Outdoor Furniture'],
  Sports: ['Gym Equipment', 'Cricket Gear', 'Football & Apparel', 'Outdoor & Camping', 'Fitness Accessories', 'Tennis & Rackets'],
  Books: ['Fiction & Literature', 'Academic & Textbooks', 'Self-Help', 'Childrens Books', 'Biographies', 'Cookbooks'],
  Cameras: ['DSLR & Mirrorless', 'Lenses', 'Drones & Action Cams', 'Studio Equipment', 'Lighting & Flashes', 'Tripods & Mounts'],
  Automobiles: ['Car Accessories', 'Motorbike Parts', 'Electronics & Audio', 'Helmets', 'Car Cleaning', 'Tools & Garage'],
  Kitchen: ['Small Appliances', 'Cookware Sets', 'Dining & Serving', 'Storage Containers', 'Bakeware', 'Cutlery & Knives'],
  Jewelry: ['Necklaces & Pendants', 'Earrings & Rings', 'Bracelets', 'Luxury Watches', 'Wedding Sets', 'Mens Jewelry'],
  Kids: ['Toys & Games', 'Baby Clothing', 'Strollers & Gear', 'Nursery Furniture', 'School Supplies', 'Kids Footwear'],
  Art: ['Paints & Canvases', 'Craft Supplies', 'Sketching Tools', 'Easels & Brushes', 'Digital Art Tablets', 'Sculpture & Modeling'],
  Accessories: ['Bags & Purses', 'Belts', 'Hats & Caps', 'Sunglasses', 'Scarves & Wraps', 'Umbrellas & Rainwear']
};

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'Made to Measure'];
const CONDITIONS = [
  { id: 'new', label: 'Brand New with Tags', desc: 'Completely unworn boutique stock' },
  { id: 'like-new', label: 'Worn Once (Mint / Like Now)', desc: 'Dry-cleaned, wedding worn, pristine condition' },
  { id: 'gently-worn', label: 'Gently Worn', desc: 'Clean, zero sequin loss or fabric pulls' }
];

export function PostRequest({ actions, draft }: { actions: Actions; draft?: Item | null }) {
  // Opened from a saved draft: every field starts with what was saved.
  const saved = (draft?.data || {}) as Record<string, any>;
  const [draftId, setDraftId] = useState(String(draft?.id || ''));
  const [savingDraft, setSavingDraft] = useState(false);
  const popularReqState = useLoad('requests?size=4', actions.revision);
  const popularRequests = (popularReqState.data?.items || [])
    .map((item: any) => item.title)
    .filter((title: string) => title && title !== 'ddsdfs' && !title.toLowerCase().includes('test'));

  const [title, setTitle] = useState(String(saved.title || ''));
  const [quantity, setQuantity] = useState(Number(saved.quantity) || 1);
  const [selectedCat, setSelectedCat] = useState(String(saved.subcategory || ''));
  const [selectedSize, setSelectedSize] = useState(String(saved.size || ''));
  const [selectedCondition, setSelectedCondition] = useState(String(saved.condition || ''));
  const [budget, setBudget] = useState(String(saved.budget || ''));
  const [negotiable, setNegotiable] = useState(saved.negotiable !== false);
  const [notes, setNotes] = useState(String(saved.notes || ''));
  const [handover, setHandover] = useState(String(saved.handover || 'in-person'));
  const [step, setStep] = useState(1);
  
  const [domain, setDomain] = useState(String(saved.domain || 'Accessories'));
  const [images, setImages] = useState<string[]>(Array.isArray(saved.images) ? saved.images : []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayCats = subCategories[domain] || subCategories['Clothes'];
  const isFashion = domain === 'Clothes' || domain === 'Accessories' || domain === 'Jewelry';

  const [busy, setBusy] = useState(false);

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > 5 * 1024 * 1024) return alert('Photo must be under 5 MB.');
      setBusy(true);
      try {
          const r = await fetch('/api/files', { method: 'POST', headers: { 'Content-Type': f.type }, body: f });
          const d = await r.json();
          if (r.ok && d.url) setImages(prev => [...prev, d.url]);
          else alert(d.error || 'Upload failed');
      } catch (err) {
          alert('Upload failed');
      }
      setBusy(false);
    }
  };

  const handleDeleteImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Keeps the form as it is now in the member's drafts (Buyer Dashboard > Draft Requests).
  const handleSaveDraft = async () => {
    if (!actions.user) { actions.open('login'); return; }
    if (!title.trim() && !notes.trim() && !budget && images.length === 0) { toast.error('Add a title, a budget or a note before saving a draft.'); return; }
    setSavingDraft(true);
    try {
      const r = await api('drafts', 'POST', { id: draftId || undefined, data: { title, quantity, domain, subcategory: selectedCat, size: selectedSize, condition: selectedCondition, budget, negotiable, notes, handover, images } });
      setDraftId(String(r.id));
      actions.refresh?.();
      toast.success(draftId ? 'Draft updated' : 'Draft saved', { description: 'You will find it under Draft Requests in your Buyer Dashboard.', action: { label: 'View drafts', onClick: () => actions.open('drafts') } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'The draft could not be saved.');
    }
    setSavingDraft(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    if (!actions.user) {
        actions.open('login');
        return;
    }
    
    setBusy(true);
    let apiCondition = 'Good';
    if (selectedCondition === 'new') apiCondition = 'New';
    if (selectedCondition === 'like-new') apiCondition = 'Like New';

    let apiDesc = notes;
    if (!apiDesc || apiDesc.length < 10) {
      apiDesc = (apiDesc + ' Looking for this item in good condition.').trim();
    }

    const result = await actions.perform('requests', 'POST', {
        title: title || 'New Request',
        description: apiDesc,
        category: domain,
        price: Number(budget) || 0,
        location: actions.location || 'Lahore',
        condition: apiCondition,
        quantity: quantity || 1,
        expiry: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        image: images.length > 0 ? images[0] : ''
    });
    setBusy(false);
    
    if (result) {
        // A request posted from a draft no longer needs the draft.
        if (draftId) { try { await api('drafts/' + encodeURIComponent(draftId), 'DELETE'); } catch { } }
        toast.success('Request posted', { description: 'Sellers can now send you offers.' });
        actions.go('Requests');
    }
  };

  return (
    <div className="pr-page-root" style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '80px' }}>
      <style>{`
        .pr-layout { display: flex; gap: 40px; align-items: flex-start; max-width: 1440px; margin: 0 auto; padding: 32px 5%; }
        .pr-left { flex: 1; min-width: 0; }
        .pr-right { width: 380px; flex-shrink: 0; display: flex; flex-direction: column; gap: 24px; }
        .pr-header-btns { margin-left: auto; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .pr-subcats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .pr-budget { display: flex; gap: 24px; align-items: center; }
        .pr-budget-input { display: flex; align-items: center; background: #f1f5f9; border-radius: 8px; padding: 12px 16px; width: 200px; }
        .pr-handover { display: flex; gap: 16px; }
        .pr-footer-btns { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
        .pr-btn-draft { background: white; border: 1px solid #cbd5e1; color: #475569; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 100px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .pr-btn-draft:hover { background: #f1f5f9; border-color: #94a3b8; }
        .pr-btn-draft:disabled { opacity: .6; cursor: not-allowed; }
        .pr-footer-left { display: flex; align-items: center; gap: 16px; }
        .pr-btn-draft-link { background: none; border: 0; color: #0f766e; font-size: 14px; font-weight: 600; cursor: pointer; padding: 8px 4px; text-decoration: underline; text-underline-offset: 3px; white-space: nowrap; }
        .pr-btn-draft-link:disabled { opacity: .6; cursor: not-allowed; }
        .pr-btn-submit { background: #ea580c; color: white; padding: 14px 32px; border-radius: 100px; border: none; font-size: 15px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3); transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .pr-btn-submit:hover { background: #c2410c; box-shadow: 0 6px 16px rgba(234, 88, 12, 0.4); transform: translateY(-1px); }
        .pr-btn-submit:disabled { background: #f97316; cursor: not-allowed; transform: none; box-shadow: none; }
        @media (max-width: 1024px) {
          .pr-layout { flex-direction: column; gap: 32px; }
          .pr-right { width: 100%; max-width: 100%; }
        }
        @media (max-width: 768px) {
          .pr-subcats { grid-template-columns: repeat(2, 1fr); }
          .pr-budget { flex-direction: column; align-items: stretch; gap: 16px; }
          .pr-budget-input { width: 100%; }
          .pr-handover { flex-direction: column; }
          .pr-footer-btns { flex-direction: column; gap: 16px; }
          .pr-footer-btns button { width: 100%; }
          .pr-footer-left { width: 100%; flex-direction: column; gap: 8px; }
          .pr-header-btns { display: none; }
          .pr-header .pl-breadcrumb { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; flex-wrap: nowrap; white-space: nowrap; }
          .pr-header .pl-breadcrumb::-webkit-scrollbar { display: none; }
          .pr-header .pl-breadcrumb button { white-space: nowrap; flex-shrink: 0; font-size: 12px; padding: 4px 10px; }
          .pr-size-condition-row { flex-direction: column !important; gap: 16px !important; }
          .pr-title-row { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
        }
        @media (max-width: 480px) {
          .pr-subcats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        }
      `}</style>
      <div className="pr-header" style={{ background: 'white', padding: '16px 5%', borderBottom: '1px solid #f1f5f9' }}>
        <div className="pl-breadcrumb" style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => actions.go('Explore')} style={{ border: 'none', cursor: 'pointer', fontWeight: 600, color: '#3b82f6', padding: '4px 12px', borderRadius: '100px', backgroundColor: '#eff6ff' }}>Browse Deals</button> 
          <span style={{ color: '#cbd5e1' }}>|</span>
          <button onClick={() => actions.go('BuyerRequests')} style={{ border: 'none', cursor: 'pointer', fontWeight: 600, color: '#3b82f6', padding: '4px 12px', borderRadius: '100px', backgroundColor: '#eff6ff' }}>All Requests</button> 
          <span style={{ color: '#cbd5e1' }}>|</span>
          <button onClick={() => actions.open('listing-form')} style={{ border: 'none', cursor: 'pointer', fontWeight: 600, color: '#3b82f6', padding: '4px 12px', borderRadius: '100px', backgroundColor: '#eff6ff' }}>Sell an item (10 Free)</button> 
        </div>
      </div>

      <div className="pr-layout">
        
        {/* LEFT COLUMN - FORM */}
        <div className="pr-left">
          <div className="pr-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0, whiteSpace: 'nowrap' }}>Post Request</h1>
              <h2 style={{ fontSize: '16px', color: '#64748b', fontWeight: 400, margin: 0, whiteSpace: 'nowrap' }}>Describe what you need?</h2>
            </div>
              <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '100px', padding: '4px', flexShrink: 0 }}>
                <div
                  onClick={() => setStep(1)}
                  style={{ cursor: 'pointer', background: step === 1 ? 'white' : 'transparent', padding: '6px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, color: step === 1 ? '#0f766e' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: step === 1 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                >
                  <span style={{ width: '18px', height: '18px', background: step === 1 ? '#0f766e' : '#cbd5e1', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>1</span> Style Brief
                </div>
                <div
                  onClick={() => setStep(2)}
                  style={{ cursor: 'pointer', background: step === 2 ? 'white' : 'transparent', padding: '6px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: step === 2 ? 600 : 500, color: step === 2 ? '#0f766e' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: step === 2 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                >
                  <span style={{ width: '18px', height: '18px', background: step === 2 ? '#0f766e' : '#cbd5e1', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>2</span> Fitting & Handoff
                </div>
              </div>
            </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {step === 1 && (
              <>
                <div className="pr-section">
              <div className="pr-field-head" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label className="pr-field-label" style={{ fontWeight: 600, color: '#0f172a' }}>What specific piece are you hunting for?</label>
                <span className="pr-field-tag" style={{ fontSize: '11px', color: '#0f766e', fontWeight: 600 }}>Active Demand Tag</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., iPhone 15 Pro Max 256GB"
                style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '16px', fontWeight: 500, color: '#0f172a', marginBottom: '12px', background: 'white' }}
              />
              {popularRequests.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Popular requests:</span>
                  {popularRequests.map((tag: string) => (
                    <span key={tag} onClick={() => setTitle(tag)} style={{ fontSize: '12px', padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '100px', cursor: 'pointer', fontWeight: 500 }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="pr-section" style={{ background: 'white', padding: '16px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>Quantity</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>How many do you need?</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 600, color: '#475569' }}>-</button>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', minWidth: '24px', textAlign: 'center' }}>{quantity}</span>
                <button type="button" onClick={() => setQuantity(quantity + 1)} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 600, color: '#475569' }}>+</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(actions.categories && actions.categories.length > 0 ? actions.categories : [{id:1, name:'Clothes'}, {id:2, name:'Electronics'}, {id:3, name:'Furniture'}, {id:4, name:'Sports'}]).map(cat => {
                const isSelected = domain === cat.name;
                return (
                  <button 
                    key={cat.id || cat.name}
                    type="button" 
                    onClick={() => { setDomain(cat.name); setSelectedCat(''); }} 
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '100px', border: 'none', background: isSelected ? '#0f172a' : '#e2e8f0', color: isSelected ? 'white' : '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <IconTag /> {cat.name}
                  </button>
                )
              })}
            </div>

            <div className="pr-section" style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontWeight: 600, color: '#0f172a' }}>Subcategory</label>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Select specific type</span>
              </div>
              <div className="pr-subcats">
                {displayCats.map((cat) => (
                  <div 
                    key={cat}
                    onClick={() => setSelectedCat(cat)}
                    style={{ padding: '16px', border: selectedCat === cat ? '2px solid #0f766e' : '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', background: selectedCat === cat ? '#f0fdf4' : 'white' }}
                  >
                    <div style={{ marginBottom: '8px', color: selectedCat === cat ? '#0f766e' : '#64748b' }}>
                      <SubIcon name={cat} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: selectedCat === cat ? '#0f766e' : '#334155' }}>{cat}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      Tap to select
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pr-size-condition-row" style={{ display: 'flex', gap: '24px' }}>
              {isFashion && (
                <div className="pr-section" style={{ flex: 1, background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <label style={{ fontWeight: 600, color: '#0f172a' }}>Size & Fit</label>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Standard or Custom</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {SIZES.map(s => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        style={{ padding: s.length > 2 ? '8px 16px' : '8px 12px', border: selectedSize === s ? 'none' : '1px solid #e2e8f0', borderRadius: '6px', background: selectedSize === s ? '#0f766e' : 'white', color: selectedSize === s ? 'white' : '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '24px', height: '24px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <span style={{ fontSize: '14px' }}>-</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                      Typical chest width ~20 in / Kurti length ~45 in
                    </div>
                  </div>
                </div>
              )}

              <div className="pr-section" style={{ flex: 1, background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ fontWeight: 600, color: '#0f172a' }}>Item State</label>
                  <span style={{ fontSize: '11px', color: '#0f766e' }}>Pre-Loved Filter</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {CONDITIONS.map(cond => (
                    <div 
                      key={cond.id} 
                      onClick={() => setSelectedCondition(cond.id)}
                      style={{ padding: '12px', border: selectedCondition === cond.id ? '1px solid #10b981' : '1px solid transparent', borderRadius: '8px', background: selectedCondition === cond.id ? '#ecfdf5' : 'transparent', display: 'flex', gap: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <div style={{ marginTop: '2px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: selectedCondition === cond.id ? '5px solid #10b981' : '2px solid #cbd5e1', background: 'white' }}></div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: selectedCondition === cond.id ? '#065f46' : '#334155', marginBottom: '2px' }}>{cond.label}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{cond.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
              </>
            )}

            {step === 2 && (
              <>
            <div className="pr-section" style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontWeight: 600, color: '#0f172a' }}>Target Budget & Willingness</label>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Estimate: Rs. 24,000 - Rs. 32,000</span>
              </div>
              <div className="pr-budget">
                <div className="pr-budget-input">
                  <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, marginRight: '12px' }}>PKR</span>
                  <input type="text" value={budget} onChange={e => setBudget(e.target.value)} style={{ border: 'none', background: 'none', outline: 'none', fontSize: '18px', fontWeight: 700, color: '#0f172a', width: '100%' }} />
                </div>
                <div style={{ background: '#eff6ff', padding: '12px 16px', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                  <input type="checkbox" checked={negotiable} onChange={e => setNegotiable(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#ea580c' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a8a' }}>Open to Reasonable Negotiation</div>
                    <div style={{ fontSize: '11px', color: '#3b82f6' }}>Accept offers +10% for superior products</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pr-section" style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontWeight: 600, color: '#0f172a' }}>{isFashion ? 'Fabric, Craft & Style Notes' : 'Specs, Model & Condition Details'}</label>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Optional details</span>
              </div>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '14px', color: '#334155', minHeight: '100px', outline: 'none', lineHeight: 1.5 }}
              />
            </div>

            <div className="pr-section" style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontWeight: 600, color: '#0f172a' }}>Reference Photos & Inspiration</label>
                <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: 600 }}>Optional</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Helps verified sellers match exact models or styles.</p>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {images.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img src={img} alt={`Ref ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => handleDeleteImage(idx)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <IconX />
                    </button>
                  </div>
                ))}
                
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAddImage} style={{ display: 'none' }} />
                
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: '120px', height: '120px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#0f766e', cursor: 'pointer' }}>
                  <IconCamera />
                  <div style={{ fontSize: '11px', fontWeight: 600 }}>Add Image</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>JPG/PNG</div>
                </button>
              </div>
            </div>

            <div className="pr-section" style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontWeight: 600, color: '#0f172a' }}>Preferred Handover Method</label>
                <span style={{ fontSize: '11px', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '4px' }}><IconShieldCheck /> Safe Trade Guarantee</span>
              </div>
              <div className="pr-handover">
                <div 
                  onClick={() => setHandover('in-person')}
                  style={{ flex: 1, padding: '16px', border: handover === 'in-person' ? '1px solid #10b981' : '1px solid transparent', background: handover === 'in-person' ? '#ecfdf5' : '#f8fafc', borderRadius: '8px', display: 'flex', gap: '12px', cursor: 'pointer' }}
                >
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: handover === 'in-person' ? '5px solid #10b981' : '1px solid #94a3b8', background: 'white', marginTop: '4px', flexShrink: 0, transition: 'all 0.2s' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>In-Person Inspection</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Mall of Lahore / Packages Mall / Gulberg III. Inspect item before cash exchange.</div>
                  </div>
                </div>
                <div 
                  onClick={() => setHandover('courier')}
                  style={{ flex: 1, padding: '16px', border: handover === 'courier' ? '1px solid #3b82f6' : '1px solid transparent', background: handover === 'courier' ? '#eff6ff' : '#f8fafc', borderRadius: '8px', display: 'flex', gap: '12px', cursor: 'pointer' }}
                >
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: handover === 'courier' ? '5px solid #3b82f6' : '1px solid #94a3b8', background: 'white', marginTop: '4px', flexShrink: 0, transition: 'all 0.2s' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>TCS / Trax Courier with Video Check</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Seller sends HD 4K video showing product details prior to dispatch.</div>
                  </div>
                </div>
              </div>
            </div>
              </>
            )}

            <div className="pr-footer-btns">
              {step === 1 ? (
                <>
                  <button type="button" className="pr-btn-draft" id="pr-save-draft" disabled={savingDraft} onClick={handleSaveDraft}>{savingDraft ? 'Saving…' : draftId ? 'Update Draft' : 'Save Draft for Later'}</button>
                  <button type="button" onClick={() => setStep(2)} className="pr-btn-submit">
                    Next: Fitting & Handoff
                  </button>
                </>
              ) : (
                <>
                  <div className="pr-footer-left">
                    <button type="button" onClick={() => setStep(1)} className="pr-btn-draft">Back</button>
                    <button type="button" className="pr-btn-draft-link" disabled={savingDraft} onClick={handleSaveDraft}>{savingDraft ? 'Saving…' : draftId ? 'Update draft' : 'Save draft'}</button>
                  </div>
                  <button type="submit" disabled={busy} className="pr-btn-submit">
                    {busy ? 'Processing...' : 'Submit Request'}
                  </button>
                </>
              )}
            </div>

          </form>
        </div>

        {/* RIGHT COLUMN - PREVIEW */}
        <div className="pr-right">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ea580c', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.05em' }}>
              <span style={{ width: '8px', height: '8px', background: '#ea580c', borderRadius: '50%' }}></span> LIVE REQUEST PREVIEW
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Buyer View</span>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <div style={{ position: 'relative', height: '240px', background: '#f8fafc' }}>
              {images.length > 0 ? (
                <img src={images[0]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', background: '#e2e8f0' }}>No image uploaded</div>
              )}
              <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'white', color: '#0f766e', fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                Worn Once • Like New
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: 700, letterSpacing: '0.05em' }}>WANTED BY BUYER</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f766e' }}>Rs. {Number(budget || 0).toLocaleString()}</div>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', lineHeight: 1.3 }}>{title || 'Request Title'} {isFashion && `(Size ${selectedSize})`}</h3>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {notes}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IconMapPin /> {actions.location || 'Lahore'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IconShieldCheck /> Negotiable • Cash/TCS</div>
              </div>

              <div style={{ background: '#ecfdf5', borderRadius: '8px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#065f46', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700 }}>{Math.floor(Math.random() * 20) + 5} Active Sellers</span> are currently active in {actions.location || 'Lahore'} matching the {domain} category.
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <IconShieldCheck size={20} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Safe Sourcing Guarantee</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>Explicit Details Guarantee</div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>Sellers are prompted to confirm exact measurements and condition before deals finalize.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>Direct Video Audits</div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>Receive authentic unedited videos showing condition and integrity of the item.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>0% Commission on Hand-to-Hand Meets</div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>Meet securely at Gulberg or DHA partner rendezvous points, examine in person, and pay directly.</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 600, color: '#0f766e' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IconCheck /> Authentic Brands Only</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IconShieldCheck /> Identity Verified Peers</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
