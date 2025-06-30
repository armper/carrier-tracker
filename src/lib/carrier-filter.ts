/**
 * Carrier Filtering Utilities
 * 
 * This module provides utilities for filtering out non-carrier entities
 * from SAFER data, ensuring the app focuses only on motor carriers
 * that are relevant for freight brokers.
 */

export interface CarrierData {
  entity_type?: string
  operation_classification?: string[]
  carrier_operation?: string[]
  [key: string]: any
}

/**
 * Check if an entity is a carrier based on entity type and other indicators
 */
export function isCarrierEntity(data: CarrierData): boolean {
  // If entity_type is null (legacy data), assume it's a carrier
  if (!data.entity_type) {
    return true
  }

  const entityType = data.entity_type.toLowerCase()
  
  // Handle multi-entity cases like "CARRIER/SHIPPER/BROKER"
  // If "carrier" appears first in the entity type, it's primarily a carrier
  if (entityType.includes('/')) {
    const firstEntity = entityType.split('/')[0].trim()
    if (firstEntity === 'carrier') {
      return true
    }
    // If broker appears first, exclude it
    if (firstEntity === 'broker') {
      return false
    }
  }
  
  // Explicitly exclude broker-only entities
  if (entityType === 'broker' || 
      entityType === 'freight forwarder' ||
      entityType === 'property broker' ||
      entityType === 'household goods broker' ||
      entityType === 'passenger broker') {
    return false
  }

  // Include carrier-related entities
  if (entityType.includes('carrier') ||
      entityType.includes('motor') ||
      entityType.includes('truck') ||
      entityType.includes('transport') ||
      entityType.includes('logistics') ||
      entityType.includes('freight') ||
      entityType.includes('hauling') ||
      entityType.includes('delivery') ||
      entityType.includes('corporation') ||
      entityType.includes('llc') ||
      entityType.includes('inc') ||
      entityType.includes('company') ||
      entityType.includes('enterprises')) {
    return true
  }

  // Additional checks based on operation classification
  if (data.operation_classification && data.operation_classification.length > 0) {
    const operationClass = data.operation_classification[0].toLowerCase()
    if (operationClass.includes('general freight') ||
        operationClass.includes('specialized') ||
        operationClass.includes('household goods') ||
        operationClass.includes('passenger')) {
      return true
    }
  }

  // Check carrier operation type
  if (data.carrier_operation && data.carrier_operation.length > 0) {
    const carrierOp = data.carrier_operation[0].toLowerCase()
    if (carrierOp.includes('authorized') ||
        carrierOp.includes('for hire') ||
        carrierOp.includes('private')) {
      return true
    }
  }

  // Default to true for legacy data or unclear cases
  return true
}

/**
 * Get Supabase query filters to exclude non-carrier entities
 * This can be chained with other Supabase query methods
 */
export function getCarrierOnlyFilters(queryBuilder: any) {
  return queryBuilder
    .not('entity_type', 'eq', 'broker')
    .not('entity_type', 'eq', 'freight forwarder')
    .not('entity_type', 'eq', 'property broker')
    .not('entity_type', 'eq', 'passenger broker')
    .not('entity_type', 'eq', 'household goods broker')
    // For multi-entity cases, we'll handle them in the application logic
    // since Supabase doesn't have easy string splitting in filters
}

/**
 * Filter an array of carrier data to include only carriers
 */
export function filterCarriersOnly<T extends CarrierData>(carriers: T[]): T[] {
  return carriers.filter(carrier => isCarrierEntity(carrier))
}

/**
 * Get a human-readable description of why an entity was filtered out
 */
export function getFilterReason(data: CarrierData): string | null {
  if (!data.entity_type) {
    return null // Not filtered out
  }

  const entityType = data.entity_type.toLowerCase()
  
  if (entityType.includes('broker')) {
    return 'Freight broker (not a motor carrier)'
  }
  if (entityType.includes('freight forwarder')) {
    return 'Freight forwarder (not a motor carrier)'
  }
  if (entityType.includes('property broker')) {
    return 'Property broker (not a motor carrier)'
  }
  if (entityType.includes('passenger broker')) {
    return 'Passenger broker (not a motor carrier)'
  }
  if (entityType.includes('household goods')) {
    return 'Household goods broker (not a motor carrier)'
  }

  return null // Not filtered out
} 