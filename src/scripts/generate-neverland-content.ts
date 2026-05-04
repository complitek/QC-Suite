/**
 * generate-neverland-content.ts
 * One-time script. Calls Claude API for full-treatment sections, auto-generates
 * skeleton summaries for the rest. Outputs neverland-content.json.
 *
 * Run: npx tsx src/scripts/generate-neverland-content.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ─── Types ────────────────────────────────────────────────────────────────────

type PartDes = 'PART_A' | 'PART_B' | 'BOTH' | 'NA'
type ReqType = 'SUBMITTAL' | 'TEST' | 'HOLD_POINT' | 'WITNESS_POINT' | 'NOTIFICATION' | 'PLAN' | 'REPORT' | 'CERTIFICATE' | 'OTHER'

interface SectionDef {
  num: string
  title: string
  full?: boolean   // true = API-generated rich content; false/undefined = skeleton only
}

interface BookDef {
  key: 'general' | 'part_a' | 'part_b'
  title: string
  part: PartDes
  sections: SectionDef[]
}

interface GeneratedRequirement {
  type: ReqType
  sdCode?: string
  title: string
  gcDesignation?: string
  description: string
  isHoldPoint?: boolean
  isWitnessPoint?: boolean
  testStandard?: string
  testFrequency?: string
  acceptanceCriteria?: string
  deadlineDays?: number
}

interface GeneratedSection {
  sectionNumber: string
  sectionTitle: string
  partDesignation: PartDes
  aiSummary: string
  fullTreatment: boolean
  requirements: GeneratedRequirement[]
}

interface OutputBook {
  key: string
  title: string
  partDesignation: PartDes
  sections: GeneratedSection[]
}

// ─── Section Definitions ──────────────────────────────────────────────────────

const BOOKS: BookDef[] = [

  // ── Book 1: General Requirements (Division 01 — applies to both parts) ──────
  {
    key: 'general',
    title: 'General Project Requirements',
    part: 'BOTH',
    sections: [
      { num: '00 01 15', title: 'LIST OF DRAWINGS' },
      { num: '01 11 00', title: 'SUMMARY OF WORK' },
      { num: '01 14 00', title: 'WORK RESTRICTIONS' },
      { num: '01 20 00', title: 'PRICE AND PAYMENT PROCEDURES' },
      { num: '01 22 00.00 10', title: 'MEASUREMENT AND PAYMENT' },
      { num: '01 30 00', title: 'ADMINISTRATIVE REQUIREMENTS' },
      { num: '01 31 19.05 20', title: 'POST AWARD MEETINGS' },
      { num: '01 31 23.13 20', title: 'ELECTRONIC CONSTRUCTION AND FACILITY SUPPORT CONTRACT MANAGEMENT SYSTEM' },
      { num: '01 32 17.00 20', title: 'COST-LOADED NETWORK ANALYSIS SCHEDULES (NAS)' },
      { num: '01 33 00', title: 'SUBMITTAL PROCEDURES', full: true },
      { num: '01 33 00.05 20', title: 'CONSTRUCTION SUBMITTAL PROCEDURES', full: true },
      { num: '01 33 10.05 20', title: 'DESIGN SUBMITTAL PROCEDURES' },
      { num: '01 33 15', title: 'ALTERNATIVE TECHNICAL CONCEPT DESIGN SUBMITTALS' },
      { num: '01 33 29', title: 'SUSTAINABILITY REQUIREMENTS AND REPORTING' },
      { num: '01 35 00.03', title: 'MEC CONSTRUCTION PROCEDURES' },
      { num: '01 35 13', title: 'SPECIAL PROJECT PROCEDURES' },
      { num: '01 35 26', title: 'GOVERNMENTAL SAFETY REQUIREMENTS', full: true },
      { num: '01 42 00', title: 'SOURCES FOR REFERENCE PUBLICATIONS' },
      { num: '01 45 00.00 20', title: 'QUALITY CONTROL FOR PART A (DBB) WORK', full: true },
      { num: '01 45 00.00 25', title: 'CAISSON AND CAISSON SEAT GEOMETRY QUALITY CONTROL', full: true },
      { num: '01 45 00.05 20', title: 'DESIGN AND CONSTRUCTION QUALITY CONTROL (FOR PART B – DB WORK)', full: true },
      { num: '01 45 35', title: 'SPECIAL INSPECTIONS', full: true },
      { num: '01 50 00', title: 'TEMPORARY CONSTRUCTION FACILITIES AND CONTROLS' },
      { num: '01 57 19', title: 'TEMPORARY ENVIRONMENTAL CONTROLS', full: true },
      { num: '01 57 19.01 20', title: 'SUPPLEMENTAL TEMPORARY ENVIRONMENTAL CONTROLS' },
      { num: '01 58 00', title: 'PROJECT IDENTIFICATION' },
      { num: '01 74 19', title: 'CONSTRUCTION WASTE MANAGEMENT AND DISPOSAL', full: true },
      { num: '01 78 00', title: 'CLOSEOUT SUBMITTALS', full: true },
      { num: '01 78 23', title: 'OPERATION AND MAINTENANCE DATA' },
      { num: '01 78 24.00 20', title: 'FACILITY ELECTRONIC OPERATION AND MAINTENANCE SUPPORT INFORMATION (eOMSI)' },
      { num: '01 91 00.15 20', title: 'TOTAL BUILDING COMMISSIONING' },
    ],
  },

  // ── Book 2: Part A — DBB Specifications ─────────────────────────────────────
  {
    key: 'part_a',
    title: 'Part A — DBB Technical Specifications',
    part: 'PART_A',
    sections: [
      // Division 02 – Existing Conditions / HazMat
      { num: '02 41 00', title: 'DEMOLITION', full: true },
      { num: '02 61 13', title: 'EXCAVATION AND HANDLING OF CONTAMINATED MATERIAL', full: true },
      { num: '02 61 23', title: 'REMOVAL AND DISPOSAL OF PCB CONTAMINATED SOILS', full: true },
      { num: '02 81 00', title: 'TRANSPORTATION AND DISPOSAL OF HAZARDOUS MATERIALS', full: true },
      { num: '02 82 00', title: 'ASBESTOS REMEDIATION', full: true },
      { num: '02 83 00', title: 'LEAD REMEDIATION', full: true },
      { num: '02 84 16', title: 'HANDLING OF LIGHTING BALLASTS AND LAMPS CONTAINING PCBs AND MERCURY' },
      { num: '02 84 33', title: 'REMOVAL AND DISPOSAL OF POLYCHLORINATED BIPHENYLS (PCBs)' },
      // Division 03 – Concrete
      { num: '03 23 00', title: 'STRESSED TENDON REINFORCING', full: true },
      { num: '03 30 00', title: 'CAST-IN-PLACE CONCRETE', full: true },
      { num: '03 31 29', title: 'MARINE CONCRETE WITH DURABILITY TESTING', full: true },
      { num: '03 45 33', title: 'PRECAST AND PRESTRESSED STRUCTURAL CONCRETE', full: true },
      // Division 04 – Masonry
      { num: '04 20 00', title: 'UNIT MASONRY' },
      { num: '04 23 00', title: 'GLASS UNIT MASONRY WINDOWS' },
      // Division 05 – Metals
      { num: '05 05 23.16', title: 'STRUCTURAL WELDING', full: true },
      { num: '05 12 00', title: 'STRUCTURAL STEEL', full: true },
      { num: '05 30 00', title: 'STEEL DECKS' },
      { num: '05 50 13', title: 'MISCELLANEOUS METAL FABRICATIONS' },
      { num: '05 51 00', title: 'METAL STAIRS' },
      { num: '05 51 33', title: 'METAL LADDERS' },
      { num: '05 52 00', title: 'METAL RAILINGS' },
      // Division 06 – Wood, Plastics, Composites
      { num: '06 10 00', title: 'ROUGH CARPENTRY' },
      { num: '06 41 16.00 10', title: 'PLASTIC-LAMINATE-CLAD ARCHITECTURAL CABINETS' },
      { num: '06 61 16', title: 'SOLID SURFACING FABRICATIONS' },
      { num: '06 70 00', title: 'FIBERGLASS REINFORCED PLASTIC (FRP) ELEMENTS' },
      // Division 07 – Thermal and Moisture Protection
      { num: '07 21 16', title: 'MINERAL FIBER BLANKET INSULATION' },
      { num: '07 22 00', title: 'ROOF AND DECK INSULATION' },
      { num: '07 27 10.00 10', title: 'BUILDING AIR BARRIER SYSTEM' },
      { num: '07 54 19', title: 'THERMOPLASTIC POLYOLEFIN (TPO) MEMBRANE ROOFING' },
      { num: '07 60 00', title: 'FLASHING AND SHEET METAL' },
      { num: '07 84 00', title: 'FIRESTOPPING' },
      { num: '07 92 00', title: 'JOINT SEALANTS' },
      // Division 08 – Openings
      { num: '08 11 13', title: 'STEEL DOORS AND FRAMES' },
      { num: '08 31 00', title: 'ACCESS DOORS AND PANELS' },
      { num: '08 33 23', title: 'OVERHEAD COILING DOORS' },
      { num: '08 51 13', title: 'ALUMINUM WINDOWS' },
      { num: '08 71 00', title: 'DOOR HARDWARE' },
      { num: '08 81 00', title: 'GLAZING' },
      { num: '08 91 00', title: 'METAL WALL AND DOOR LOUVERS' },
      // Division 09 – Finishes
      { num: '09 22 00', title: 'SUPPORTS FOR GYPSUM BOARD' },
      { num: '09 29 00', title: 'GYPSUM BOARD' },
      { num: '09 30 10', title: 'CERAMIC, QUARRY, AND GLASS TILING' },
      { num: '09 51 00', title: 'ACOUSTICAL CEILINGS' },
      { num: '09 65 00', title: 'RESILIENT FLOORING' },
      { num: '09 90 00', title: 'PAINTS AND COATINGS' },
      { num: '09 97 13.16', title: 'INTERIOR COATING OF WELDED STEEL WATER TANKS' },
      { num: '09 97 13.26', title: 'COATING OF STEEL WATERFRONT STRUCTURES, ZERO VOC, SPLASH ZONE COATING (SZC)', full: true },
      { num: '09 97 13.27', title: 'HIGH PERFORMANCE COATING FOR STEEL STRUCTURES' },
      // Division 10 – Specialties
      { num: '10 11 00', title: 'VISUAL DISPLAY UNITS' },
      { num: '10 14 00.20', title: 'INTERIOR AND EXTERIOR SIGNAGE' },
      { num: '10 28 13', title: 'TOILET ACCESSORIES' },
      { num: '10 44 16', title: 'FIRE EXTINGUISHERS' },
      { num: '10 51 13', title: 'METAL LOCKERS' },
      // Division 12 – Furnishings
      { num: '12 21 00', title: 'WINDOW BLINDS' },
      // Division 13 – Special Construction
      { num: '13 34 19', title: 'METAL BUILDING SYSTEMS' },
      { num: '13 48 73', title: 'SEISMIC CONTROL FOR MECHANICAL EQUIPMENT' },
      // Division 21 – Fire Suppression
      { num: '21 12 00', title: 'DRY DOCK FIRE WATER SYSTEMS', full: true },
      { num: '21 13 13', title: 'WET PIPE SPRINKLER SYSTEMS, FIRE PROTECTION' },
      // Division 22 – Plumbing
      { num: '22 00 00', title: 'PLUMBING, GENERAL PURPOSE' },
      { num: '22 05 48.00 20', title: 'MECHANICAL SOUND, VIBRATION, AND SEISMIC CONTROL' },
      { num: '22 15 13.00 20', title: 'HIGH PRESSURE AIR SYSTEM' },
      { num: '22 15 14.00 40', title: 'GENERAL SERVICE COMPRESSED-AIR SYSTEMS, LOW PRESSURE' },
      { num: '22 15 43', title: 'NITROGEN PIPING' },
      // Division 23 – HVAC
      { num: '23 03 00.00 20', title: 'BASIC MECHANICAL MATERIALS AND METHODS' },
      { num: '23 05 48.19', title: 'SEISMIC BRACING FOR MECHANICAL SYSTEMS' },
      { num: '23 05 93', title: 'TESTING, ADJUSTING, AND BALANCING FOR HVAC' },
      { num: '23 07 00', title: 'THERMAL INSULATION FOR MECHANICAL SYSTEMS' },
      { num: '23 09 13', title: 'INSTRUMENTATION AND CONTROL DEVICES FOR HVAC' },
      { num: '23 09 53.00 20', title: 'SPACE TEMPERATURE CONTROL SYSTEMS' },
      { num: '23 21 23', title: 'HYDRONIC PUMPS' },
      { num: '23 23 00', title: 'REFRIGERANT PIPING' },
      { num: '23 25 00', title: 'CHEMICAL TREATMENT OF WATER FOR MECHANICAL SYSTEMS' },
      { num: '23 30 00', title: 'HVAC AIR DISTRIBUTION' },
      { num: '23 35 19.00 20', title: 'INDUSTRIAL VENTILATION AND EXHAUST' },
      { num: '23 64 10', title: 'WATER CHILLERS, VAPOR COMPRESSION TYPE' },
      { num: '23 64 26', title: 'CHILLED AND AUXILIARY SEA WATER PIPING SYSTEMS' },
      { num: '23 81 00', title: 'DECENTRALIZED UNITARY HVAC EQUIPMENT' },
      { num: '23 81 23', title: 'COMPUTER ROOM AIR CONDITIONING UNITS' },
      // Division 25 – Integrated Automation / Cybersecurity
      { num: '25 05 11.01', title: 'CYBERSECURITY FOR CAISSON RF ALARM PANEL' },
      { num: '25 05 11.02', title: 'CYBERSECURITY FOR SECURITY ACCESS CONTROL SYSTEMS' },
      { num: '25 05 11.03', title: 'CYBERSECURITY FOR DOCK CONTROL SYSTEMS', full: true },
      { num: '25 05 11.04', title: 'CYBERSECURITY FOR ELECTRICAL DISTRIBUTION CONTROL SYSTEMS' },
      { num: '25 05 11.05', title: 'CYBERSECURITY FOR AMI CONTROL SYSTEMS' },
      { num: '25 05 11.06', title: 'CYBERSECURITY FOR INDUSTRIAL COMMODITIES CONTROL SYSTEMS' },
      { num: '25 05 11.07', title: 'CYBERSECURITY FOR SANITARY SEWER PUMP STATION' },
      { num: '25 05 11.08', title: 'CYBERSECURITY FOR ENVIRONMENTAL CONTROL SYSTEMS' },
      { num: '25 05 11.09', title: 'CYBERSECURITY FOR FIRE ALARM CONTROL SYSTEMS' },
      { num: '25 08 11.00 20', title: 'RISK MANAGEMENT FRAMEWORK FOR DOCK CONTROL SYSTEM (DCS)' },
      // Division 26 – Electrical
      { num: '26 05 33', title: 'DOCKSIDE POWER CONNECTION STATIONS' },
      { num: '26 05 48.00 10', title: 'SEISMIC PROTECTION FOR ELECTRICAL EQUIPMENT' },
      { num: '26 08 00', title: 'APPARATUS INSPECTION AND TESTING' },
      { num: '26 11 13.00 20', title: 'PRIMARY UNIT SUBSTATION' },
      { num: '26 11 16', title: 'SECONDARY UNIT SUBSTATIONS' },
      { num: '26 13 13', title: 'METAL-CLAD SWITCHGEAR AND MOTOR CONTROL CENTER' },
      { num: '26 20 00', title: 'INTERIOR DISTRIBUTION SYSTEM' },
      { num: '26 23 00', title: 'LOW-VOLTAGE SWITCHGEAR' },
      { num: '26 24 13', title: 'SWITCHBOARDS' },
      { num: '26 27 14.00 20', title: 'ELECTRICITY METERING' },
      { num: '26 28 01.00 10', title: 'COORDINATED POWER SYSTEM PROTECTION' },
      { num: '26 29 01.00 10', title: 'ELECTRIC MOTORS, 3-PHASE VERTICAL INDUCTION TYPE' },
      { num: '26 29 23', title: 'ADJUSTABLE SPEED DRIVE (ASD) SYSTEMS UNDER 600 VOLTS' },
      { num: '26 32 15.00', title: 'ENGINE-GENERATOR SET STATIONARY 15-2500 KW, WITH AUXILIARIES' },
      { num: '26 36 23', title: 'AUTOMATIC TRANSFER SWITCHES AND BY-PASS/ISOLATION SWITCH' },
      { num: '26 41 00', title: 'LIGHTNING PROTECTION SYSTEM' },
      { num: '26 42 13', title: 'GALVANIC (SACRIFICIAL) ANODE CATHODIC PROTECTION (GACP) SYSTEM', full: true },
      { num: '26 42 15', title: 'CATHODIC PROTECTION SYSTEM FOR THE INTERIOR OF STEEL WATER TANKS' },
      { num: '26 42 17', title: 'IMPRESSED CURRENT CATHODIC PROTECTION (ICCP) SYSTEM', full: true },
      { num: '26 51 00', title: 'INTERIOR LIGHTING' },
      { num: '26 56 00', title: 'EXTERIOR LIGHTING' },
      // Division 27 – Communications
      { num: '27 10 00', title: 'BUILDING TELECOMMUNICATIONS CABLING SYSTEM' },
      { num: '27 53 19', title: 'DISTRIBUTED ANTENNAE SYSTEMS (DAS)' },
      // Division 28 – Electronic Safety and Security
      { num: '28 31 70', title: 'INTERIOR FIRE ALARM SYSTEM, ADDRESSABLE' },
      // Division 31 – Earthwork
      { num: '31 05 23', title: 'GEOFOAM' },
      { num: '31 23 00.00 20', title: 'EXCAVATION AND FILL', full: true },
      { num: '31 31 16.13', title: 'CHEMICAL TERMITE CONTROL' },
      { num: '31 31 16.19', title: 'TERMITE CONTROL BARRIERS' },
      { num: '31 41 16', title: 'METAL SHEET PILING' },
      { num: '31 62 00', title: 'STONE COLUMNS' },
      { num: '31 62 13.20', title: 'PRECAST/PRESTRESSED CONCRETE PILES', full: true },
      { num: '31 62 16.16', title: 'STEEL H-PILES', full: true },
      { num: '31 63 29', title: 'DRILLED CONCRETE PIERS AND SHAFTS', full: true },
      // Division 32 – Exterior Improvements
      { num: '32 01 19.61', title: 'SEALING OF JOINTS IN RIGID PAVEMENT' },
      { num: '32 11 20', title: 'BASE COURSE FOR RIGID PAVING' },
      { num: '32 11 23', title: 'AGGREGATE BASE COURSES' },
      { num: '32 12 16.16', title: 'ROAD-MIX ASPHALT PAVING' },
      { num: '32 13 14.13', title: 'CONCRETE PAVING FOR HEAVY DUTY PAVEMENTS' },
      { num: '32 13 73.19', title: 'COMPRESSION CONCRETE PAVING JOINT SEALANT' },
      { num: '32 17 23', title: 'PAVEMENT MARKINGS' },
      { num: '32 31 13', title: 'CHAIN LINK FENCES AND GATES' },
      // Division 33 – Utilities
      { num: '33 56 21.17', title: 'SINGLE WALL ABOVEGROUND FIXED ROOF STEEL WATER STORAGE TANK' },
      { num: '33 56 53', title: 'COMPRESSED GASES STORAGE TANKS' },
      { num: '33 71 01', title: 'OVERHEAD TRANSMISSION AND DISTRIBUTION' },
      { num: '33 71 02', title: 'UNDERGROUND ELECTRICAL DISTRIBUTION' },
      { num: '33 81 27', title: 'DOCKSIDE TELECOMMUNICATIONS DISTRIBUTION SYSTEMS' },
      // Division 34 – Transportation
      { num: '34 11 19.00 20', title: 'WELDING CRANE AND RAILROAD RAIL — THERMITE METHOD' },
      // Division 35 – Waterway and Marine Construction
      { num: '35 20 14', title: 'WEIRS' },
      { num: '35 20 23', title: 'DREDGING', full: true },
      { num: '35 31 19', title: 'STONE, CHANNEL, SHORELINE/COASTAL PROTECTION FOR STRUCTURES', full: true },
      { num: '35 32 00', title: 'LEVELING COURSE' },
      { num: '35 45 01', title: 'VERTICAL PUMPS AND MIXED-FLOW IMPELLER-TYPE', full: true },
      { num: '35 45 04.00 10', title: 'SUBMERSIBLE PUMP, CENTRIFUGAL TYPE' },
      { num: '35 59 13.13', title: 'PRESTRESSED CONCRETE FENDER PILING', full: true },
      { num: '35 59 13.16', title: 'EXTRUDED AND MOLDED MARINE FENDERS' },
      { num: '35 59 30', title: 'CAPSTANS AND ROLLER CHOCKS' },
      // Division 40 – Process Interconnections
      { num: '40 05 13', title: 'PIPELINES, LIQUID PROCESS PIPING' },
      { num: '40 05 13.96', title: 'WELDING PROCESS PIPING' },
      { num: '40 60 00', title: 'PROCESS CONTROL', full: true },
      { num: '40 94 10', title: 'ELECTRICAL SUPERVISORY CONTROL AND DATA ACQUISITION SYSTEM NEW FIELD EQUIPMENT', full: true },
      // Division 41 – Material Processing and Handling Equipment
      { num: '41 22 13.14', title: 'BRIDGE CRANES, OVERHEAD ELECTRIC, TOP RUNNING', full: true },
      { num: '41 22 13.33', title: 'PORTAL CRANE TRACK INSTALLATION', full: true },
      // Division 46 – Water and Wastewater Equipment
      { num: '46 21 00', title: 'ROTARY LOBE PUMPS' },
      // SWBS – Ship Work Breakdown Structure (Caisson)
      { num: 'SWBS 000', title: 'GENERAL GUIDANCE AND ADMINISTRATION (CAISSON)', full: true },
      { num: 'SWBS 042', title: 'GENERAL ADMINISTRATIVE REQUIREMENTS (CAISSON)' },
      { num: 'SWBS 045', title: 'CARE OF CAISSON DURING CONSTRUCTION' },
      { num: 'SWBS 070', title: 'GENERAL REQUIREMENTS FOR CONSTRUCTION (CAISSON)' },
      { num: 'SWBS 071', title: 'ACCESS (CAISSON)' },
      { num: 'SWBS 073', title: 'NOISE, VIBRATION, AND RESILIENT MOUNTINGS (CAISSON)' },
      { num: 'SWBS 074', title: 'WELDING (CAISSON)' },
      { num: 'SWBS 076', title: 'THREADED FASTENERS (CAISSON)' },
      { num: 'SWBS 078', title: 'MATERIALS (CAISSON)' },
      { num: 'SWBS 084', title: 'TRANSPORTATION (CAISSON)' },
      { num: 'SWBS 085', title: 'DRAWINGS AND SUBMITTALS (CAISSON)' },
      { num: 'SWBS 086', title: 'TECHNICAL MANUALS (CAISSON)' },
      { num: 'SWBS 090', title: 'QUALITY ASSURANCE REQUIREMENTS (CAISSON)' },
      { num: 'SWBS 092', title: 'GENERAL REQUIREMENTS FOR TESTING (CAISSON)' },
      { num: 'SWBS 094', title: 'TRIALS (CAISSON)' },
      { num: 'SWBS 095', title: 'ON BOARD TESTS (CAISSON)' },
      { num: 'SWBS 096', title: 'WEIGHT CONTROL (CAISSON)' },
      { num: 'SWBS 097', title: 'INCLINING EXPERIMENT (CAISSON)' },
      { num: 'SWBS 100', title: 'HULL STRUCTURE (CAISSON)', full: true },
      { num: 'SWBS 111', title: 'PLATING (CAISSON)' },
      { num: 'SWBS 116', title: 'HULL FRAMING (CAISSON)' },
      { num: 'SWBS 120', title: 'STRUCTURAL BULKHEADS (CAISSON)' },
      { num: 'SWBS 130', title: 'DECK AND PLATFORM (CAISSON)' },
      { num: 'SWBS 180', title: 'FOUNDATIONS (CAISSON)' },
      { num: 'SWBS 192', title: 'STRUCTURAL TIGHTNESS (CAISSON)' },
      { num: 'SWBS 300', title: 'ELECTRICAL SYSTEMS (CAISSON)', full: true },
      { num: 'SWBS 301', title: 'ELECTRICAL CONNECTION BOXES (CAISSON)' },
      { num: 'SWBS 302', title: 'ELECTRIC MOTORS AND ASSOCIATED ELECTRIC EQUIPMENT (CAISSON)' },
      { num: 'SWBS 303', title: 'PROTECTIVE DEVICES FOR ELECTRIC CIRCUITS (CAISSON)' },
      { num: 'SWBS 304', title: 'ELECTRIC RACEWAYS AND CABLE (CAISSON)' },
      { num: 'SWBS 305', title: 'ELECTRICAL DESIGNATING AND MARKING (CAISSON)' },
      { num: 'SWBS 320', title: 'GENERAL REQUIREMENTS FOR ELECTRIC POWER DISTRIBUTION SYSTEMS (CAISSON)' },
      { num: 'SWBS 331', title: 'GENERAL REQUIREMENTS FOR LIGHTING SYSTEM (CAISSON)' },
      { num: 'SWBS 332', title: 'RECEPTACLE CIRCUITS (CAISSON)' },
      { num: 'SWBS 400', title: 'ALARMS AND INDICATORS (CAISSON)' },
      { num: 'SWBS 436', title: 'ELECTRICAL ALARM, SAFETY, AND WARNING SYSTEMS (CAISSON)' },
      { num: 'SWBS 437', title: 'INDICATING AND METERING SYSTEMS (CAISSON)' },
      { num: 'SWBS 500', title: 'AUXILIARY SYSTEMS (CAISSON)', full: true },
      { num: 'SWBS 503', title: 'PUMPS (CAISSON)' },
      { num: 'SWBS 505', title: 'GENERAL REQUIREMENTS FOR PIPING SYSTEMS (CAISSON)' },
      { num: 'SWBS 506', title: 'AIR ESCAPES (VENTS) (CAISSON)' },
      { num: 'SWBS 507', title: 'MACHINERY AND PIPING DESIGNATING AND MARKING (CAISSON)' },
      { num: 'SWBS 510', title: 'CLIMATE CONTROL (CAISSON)' },
      { num: 'SWBS 512', title: 'VENTILATION (CAISSON)' },
      { num: 'SWBS 555', title: 'FIRE EXTINGUISHING SYSTEMS (CAISSON)' },
      { num: 'SWBS 582', title: 'MOORING FITTINGS (CAISSON)' },
      { num: 'SWBS 600', title: 'OUTFITTING AND FURNISHINGS (CAISSON)' },
      { num: 'SWBS 602', title: 'HULL DESIGNATION AND MARKINGS (CAISSON)' },
      { num: 'SWBS 603', title: 'DRAFT MARKS (CAISSON)' },
      { num: 'SWBS 604', title: 'LOCKS, KEYS, AND TAGS (CAISSON)' },
      { num: 'SWBS 611', title: 'HULL FITTINGS (CAISSON)' },
      { num: 'SWBS 612', title: 'GUARDRAILS, GUARD CHAINS AND TOEBOARDS (CAISSON)' },
      { num: 'SWBS 622', title: 'LADDERS, GUARDRAILS, HINGED RAMP AND CATWALKS (CAISSON)' },
      { num: 'SWBS 624', title: 'HATCHES, DOORWAYS, AND MANHOLES (CAISSON)' },
      { num: 'SWBS 631', title: 'PAINTING (CAISSON)' },
      { num: 'SWBS 632', title: 'METALLIC COATING (CAISSON)' },
      { num: 'SWBS 633', title: 'CATHODIC PROTECTION (CAISSON)' },
      { num: 'SWBS 634', title: 'DECK COVERING (CAISSON)' },
      { num: 'SWBS 636', title: 'PERMANENT BALLAST (CAISSON)' },
      { num: 'SWBS 691', title: 'CAISSON RUBBER SEALS' },
    ],
  },

  // ── Book 3: Part B — DB Specifications (DP-1 + DP-2 unique sections) ────────
  {
    key: 'part_b',
    title: 'Part B — DB Technical Specifications',
    part: 'PART_B',
    sections: [
      // DP-1 unique sections
      { num: '02 42 91', title: 'REMOVAL AND SALVAGE OF HISTORIC CONSTRUCTION MATERIALS', full: true },
      { num: '03 30 53', title: 'MISCELLANEOUS CAST-IN-PLACE CONCRETE' },
      { num: '31 11 00', title: 'CLEARING AND GRUBBING', full: true },
      // DP-2 unique sections not in Part A
      { num: '03 62 16', title: 'METALLIC NON-SHRINK GROUTING' },
      { num: '05 05 20', title: 'POST-INSTALLED CONCRETE AND MASONRY ANCHORS' },
      { num: '07 05 23', title: 'PRESSURE TESTING AN AIR BARRIER SYSTEM FOR AIR TIGHTNESS' },
      { num: '07 13 53', title: 'ELASTOMERIC SHEET WATERPROOFING' },
      { num: '07 17 00', title: 'BENTONITE WATERPROOFING' },
      { num: '07 54 23', title: 'THERMOPLASTIC POLYOLEFIN (TPO) ROOFING' },
      { num: '09 24 23', title: 'CEMENT STUCCO' },
      { num: '09 67 23.16', title: 'FUEL RESISTIVE RESINOUS FLOORING, 5-COAT SYSTEM' },
      { num: '09 67 23.17', title: 'ELECTROSTATIC DISSIPATIVE (ESD) RESINOUS FLOORING' },
      { num: '09 96 00', title: 'HIGH-PERFORMANCE COATINGS' },
      { num: '10 21 13', title: 'TOILET COMPARTMENTS' },
      { num: '21 30 00', title: 'FIRE PUMPS' },
      { num: '22 13 29', title: 'SANITARY SEWERAGE PUMPS' },
      { num: '22 15 13', title: 'COMPRESSED-AIR PIPING, PIPING COMPONENTS AND VALVES, STAINLESS' },
      { num: '22 15 19.19 20', title: 'NONLUBRICATED ROTARY SCREW AIR COMPRESSORS (100 HP AND LARGER)' },
      { num: '23 65 00', title: 'COOLING TOWERS AND REMOTE EVAPORATIVELY-COOLED CONDENSERS' },
      { num: '26 05 48.00 10', title: 'SEISMIC PROTECTION FOR ELECTRICAL EQUIPMENT' },
      { num: '26 11 13.00 21', title: 'PRIMARY UNIT SUBSTATION (PART B)' },
      { num: '26 11 13.00 22', title: 'PRIMARY SWITCHGEAR (PART B)' },
      { num: '26 11 16.01', title: 'SECONDARY UNIT SUBSTATIONS (PART B)' },
      { num: '26 23 00.01', title: 'LOW-VOLTAGE SWITCHGEAR (PART B)' },
      { num: '26 27 14.00 21', title: 'ELECTRICITY METERING (PART B)' },
      { num: '26 28 01.00 11', title: 'COORDINATED POWER SYSTEM PROTECTION (PART B)' },
      { num: '26 42 13', title: 'GALVANIC (SACRIFICIAL) ANODE CATHODIC PROTECTION (GACP) SYSTEM (PART B)' },
      { num: '27 51 16', title: 'PUBLIC ADDRESS SYSTEMS' },
      { num: '28 08 10', title: 'ELECTRONIC SECURITY SYSTEM ACCEPTANCE TESTING' },
      { num: '28 10 05', title: 'ELECTRONIC SECURITY SYSTEMS (ESS)' },
      { num: '31 63 16', title: 'AUGERED CAST-IN-PLACE PILES' },
      { num: '32 01 16.71', title: 'COLD MILLING ASPHALT PAVING' },
      { num: '32 01 17.61', title: 'SEALING CRACKS IN ASPHALT PAVING' },
      { num: '32 01 19.61', title: 'SEALING OF JOINTS IN RIGID PAVEMENT' },
      { num: '32 05 33', title: 'LANDSCAPE ESTABLISHMENT' },
      { num: '32 11 20', title: 'SUBBASE FOR FLEXIBLE PAVING' },
      { num: '32 11 23', title: 'GRADED CRUSHED AGGREGATE BASE COURSE FOR FLEXIBLE PAVING' },
      { num: '32 11 26.19', title: 'BITUMINOUS-STABILIZED BASE COURSES' },
      { num: '32 12 13', title: 'BITUMINOUS TACK AND PRIME COATS' },
      { num: '32 12 16.16', title: 'ROAD-MIX ASPHALT PAVING' },
      { num: '32 12 16.19', title: 'COLD-MIX ASPHALT PAVING' },
      { num: '32 13 14.13', title: 'CONCRETE PAVING FOR HEAVY DUTY PAVEMENTS' },
      { num: '32 15 00', title: 'AGGREGATE SURFACING' },
      { num: '32 16 19', title: 'CONCRETE CURBS, GUTTERS AND SIDEWALKS' },
      { num: '32 17 23', title: 'PAVEMENT MARKINGS' },
      { num: '32 31 13.53', title: 'HIGH-SECURITY FENCES (CHAIN LINK) AND GATES' },
      { num: '32 84 23', title: 'UNDERGROUND SPRINKLERS' },
      { num: '32 92 19', title: 'SEEDING' },
      { num: '32 93 00', title: 'EXTERIOR PLANTS' },
      { num: '33 01 30.16', title: 'TV INSPECTION OF SEWER LINES' },
      { num: '33 11 00', title: 'WATER UTILITY DISTRIBUTION PIPING' },
      { num: '33 16 15', title: 'WATER STORAGE STEEL TANKS' },
      { num: '33 30 00', title: 'SANITARY SEWERAGE' },
      { num: '33 31 23.00 10', title: 'SANITARY SEWER FORCE MAIN PIPING' },
      { num: '33 32 13.13', title: 'PACKAGED UTILITY STORMWATER LIFT STATION' },
      { num: '33 40 00', title: 'STORMWATER UTILITIES' },
      { num: '33 46 16', title: 'SUBDRAINAGE PIPING' },
      { num: '33 71 02', title: 'UNDERGROUND ELECTRICAL DISTRIBUTION' },
      { num: '33 81 27', title: 'DOCKSIDE TELECOMMUNICATIONS DISTRIBUTION SYSTEMS' },
      { num: '33 82 00', title: 'TELECOMMUNICATIONS OUTSIDE PLANT (OSP)' },
      { num: '40 05 13.96', title: 'WELDING PROCESS PIPING' },
      { num: '40 60 00', title: 'PROCESS CONTROL' },
      { num: '40 94 10', title: 'ELECTRICAL SUPERVISORY CONTROL AND DATA ACQUISITION SYSTEM NEW FIELD EQUIPMENT' },
      { num: '41 22 23.19', title: 'MONORAIL HOISTS' },
      { num: '43 11 00.10', title: 'OFF-GAS FANS, BLOWERS AND PUMPS', full: true },
    ],
  },
]

// ─── API Generation ───────────────────────────────────────────────────────────

async function generateFullContent(num: string, title: string): Promise<{ summary: string; requirements: GeneratedRequirement[] }> {
  const prompt = `You are a NAVFAC federal construction QC expert. Generate structured data for spec section ${num} — "${title}" on a TIER 3 hybrid dry dock construction project at Naval Station Neverland (a fictional test project).

Return valid JSON only (no markdown fences, no extra text):
{
  "summary": "2-3 sentence technical description of what this section governs and why it matters for QC",
  "requirements": [
    {
      "type": "SUBMITTAL|TEST|HOLD_POINT|WITNESS_POINT|PLAN|REPORT|CERTIFICATE",
      "sdCode": "SD-01",
      "title": "brief requirement title",
      "gcDesignation": "G",
      "description": "1-2 sentence description of what is required",
      "isHoldPoint": false,
      "isWitnessPoint": false,
      "testStandard": "ASTM C39",
      "testFrequency": "1 per 50 CY",
      "acceptanceCriteria": "minimum 4000 psi at 28 days",
      "deadlineDays": 21
    }
  ]
}

Rules:
- Include 3-8 requirements; focus on what a QC Manager actually tracks
- SD codes: SD-01 Preconstruction, SD-02 Shop Drawings, SD-03 Product Data, SD-04 Samples, SD-05 Design Data, SD-06 Test Reports, SD-07 Certificates, SD-08 Manufacturer Instructions, SD-10 Operation and Maintenance, SD-11 Closeout
- gcDesignation: "G" = Government must approve before proceeding, "C" = Contractor certifies
- isHoldPoint true = work cannot proceed without Government approval
- Only include testStandard/testFrequency/acceptanceCriteria for TEST type
- Only include sdCode/gcDesignation for SUBMITTAL type
- deadlineDays = days before the related construction activity begins (or days from NTP for pre-work items)
- Omit fields that don't apply (don't include null values)`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { text: string }).text.trim()
  const text = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
  const parsed = JSON.parse(text)
  return {
    summary: parsed.summary,
    requirements: parsed.requirements || [],
  }
}

function skeletonSummary(num: string, title: string): string {
  return `Specification section ${num} — ${title} — establishes requirements in accordance with UFGS standards for the Naval Station Neverland dry dock construction project.`
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const output: OutputBook[] = []
  let totalFull = 0
  let totalSkeleton = 0
  let apiCallCount = 0

  for (const book of BOOKS) {
    console.log(`\n📖 Processing: ${book.title}`)
    const sections: GeneratedSection[] = []

    for (const sec of book.sections) {
      if (sec.full) {
        process.stdout.write(`  ⚡ ${sec.num} (full)... `)
        let summary = ''
        let requirements: GeneratedRequirement[] = []

        try {
          const result = await generateFullContent(sec.num, sec.title)
          summary = result.summary
          requirements = result.requirements
          apiCallCount++
          console.log(`✓ (${requirements.length} reqs)`)
        } catch (err: any) {
          console.log(`✗ API error: ${err?.message ?? err}`)
          summary = skeletonSummary(sec.num, sec.title)
        }

        sections.push({
          sectionNumber: sec.num,
          sectionTitle: sec.title,
          partDesignation: book.part,
          aiSummary: summary,
          fullTreatment: true,
          requirements,
        })
        totalFull++

        // Small delay to avoid rate limiting
        await sleep(300)
      } else {
        sections.push({
          sectionNumber: sec.num,
          sectionTitle: sec.title,
          partDesignation: book.part,
          aiSummary: skeletonSummary(sec.num, sec.title),
          fullTreatment: false,
          requirements: [],
        })
        totalSkeleton++
      }
    }

    output.push({
      key: book.key,
      title: book.title,
      partDesignation: book.part,
      sections,
    })
  }

  const outputPath = path.join(__dirname, 'neverland-content.json')
  fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), books: output }, null, 2))

  console.log('\n─────────────────────────────────────────')
  console.log(`✅ Done`)
  console.log(`   Full treatment sections : ${totalFull}`)
  console.log(`   Skeleton sections       : ${totalSkeleton}`)
  console.log(`   API calls made          : ${apiCallCount}`)
  console.log(`   Output                  : ${outputPath}`)
}

main().catch(console.error).finally(() => process.exit(0))
