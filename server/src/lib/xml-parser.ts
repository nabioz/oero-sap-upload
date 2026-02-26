import { XMLParser } from 'fast-xml-parser';
import type { ParsedXmlResult } from '../types';

export const parseXML = (xmlData: string): ParsedXmlResult => {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    return parser.parse(xmlData) as ParsedXmlResult;
};
