import React from 'react';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

interface CategoryIconProps {
    icon: string;
    iconType?: string;
    size?: number;
    color?: string;
}

/**
 * Renders a category icon using the correct icon library based on iconType.
 * Supports 'material' (MaterialCommunityIcons) and 'feather' (Feather) icon types.
 */
export default function CategoryIcon({ icon, iconType, size = 24, color = '#374151' }: CategoryIconProps) {
    if (iconType === 'material') {
        return <MaterialCommunityIcons name={icon as any} size={size} color={color} />;
    }
    // Default to Feather for backwards compatibility
    return <Feather name={icon as any} size={size} color={color} />;
}
