import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bath, BedDouble, Heart, MapPin, Maximize, ArrowUpRight } from 'lucide-react';
import { formatArea, formatPrice } from '../lib/api';
import { useConfig } from '../lib/config';
import { staggerItem } from './Motion';
import Media3D from './Media3D';

export default function PropertyCard({ property, variant }) {
  const { settings } = useConfig();
  const symbol = settings.features?.currency_symbol || '₹';
  const [liked, setLiked] = useState(false);
  const img =
    property.main_image ||
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80';

  return (
    <motion.article
      className={`prop-card prop-card-3d${variant === 'spotlight' ? ' prop-card--spotlight' : ''}`}
      variants={staggerItem}
      whileHover={{ y: -12, transition: { type: 'spring', stiffness: 320, damping: 18 } }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <Media3D src={img} alt={property.title} className="prop-media3d">
        <div className="media-overlay" />
        <div className="badges">
          {property.is_featured ? <span className="badge featured">Featured</span> : null}
          <span className={`badge ${property.purpose}`}>
            {property.purpose === 'sale' ? 'For Sale' : 'For Rent'}
          </span>
        </div>
        <button
          type="button"
          className={`wish-btn ${liked ? 'on' : ''}`}
          aria-label="Save"
          onClick={(e) => {
            e.preventDefault();
            setLiked((v) => !v);
          }}
        >
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
        </button>
        <Link to={`/property/${property.slug}`} className="quick-view">
          View Details <ArrowUpRight size={14} />
        </Link>
      </Media3D>
      <div className="prop-body">
        <div className="prop-top">
          <p className="price">{formatPrice(property, symbol)}</p>
          <span className="type-pill">{property.type_name || 'Property'}</span>
        </div>
        <h3>
          <Link to={`/property/${property.slug}`}>{property.title}</Link>
        </h3>
        {variant === 'spotlight' && property.short_description && (
          <p className="prop-desc">{property.short_description}</p>
        )}
        <div className="meta-row loc">
          <MapPin size={13} />
          <span>
            {property.locality || property.location_name}, {property.city}
          </span>
        </div>
        <div className="prop-specs">
          {property.bedrooms != null && (
            <div>
              <BedDouble size={14} />
              <b>{property.bedrooms}</b>
              <span>Beds</span>
            </div>
          )}
          {property.bathrooms != null && (
            <div>
              <Bath size={14} />
              <b>{property.bathrooms}</b>
              <span>Baths</span>
            </div>
          )}
          {(property.carpet_area || property.builtup_area || property.plot_area) != null && (
            <div>
              <Maximize size={14} />
              <b>{formatArea(property.carpet_area || property.builtup_area || property.plot_area)}</b>
              <span>{property.area_unit || 'sqft'}</span>
            </div>
          )}
        </div>
        <div className="card-actions">
          <Link className="btn btn-ghost" to={`/property/${property.slug}`}>
            Details
          </Link>
          <Link className="btn btn-primary" to={`/property/${property.slug}#enquire`}>
            Enquire
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
