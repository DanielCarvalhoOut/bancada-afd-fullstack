import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsDefined,
  IsIn, IsNumber,
  IsOptional, IsString, Matches, MaxLength, ValidateNested,
} from 'class-validator';
import { AutomatonKind } from '../../domain/automaton';

export class StateDto {
  @IsString() id: string;
  @IsString() @MaxLength(40) name: string;
  @IsBoolean() initial: boolean;
  @IsBoolean() accepting: boolean;
  // posição no canvas: criar/arrastar com o mouse gera valores fracionados
  @IsNumber({ allowNaN: false, allowInfinity: false }) x: number;
  @IsNumber({ allowNaN: false, allowInfinity: false }) y: number;
}

export class TransitionDto {
  @IsString() from: string;
  @IsString() to: string;

  /** Um símbolo por caractere (ε incluído); a palavra é lida caractere a caractere. */
  @IsArray() @ArrayNotEmpty() @ArrayUnique() @IsString({ each: true })
  @Matches(/^[^\s,]$/u, { each: true, message: 'cada símbolo de uma transição deve ser um único caractere (ε é aceito)' })
  symbols: string[];
}

export class AutomatonModelDto {
  @IsOptional() @IsIn(['afd', 'afn'])
  kind?: AutomatonKind;

  /** Σ: 1 a 10 símbolos de um caractere cada, sem repetição e sem ε. */
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ArrayUnique()
  @Matches(/^[^\s,ε]$/u, { each: true, message: 'cada símbolo de Σ deve ser um único caractere (e não ε, vírgula ou espaço)' })
  alphabet?: string[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => StateDto)
  states: StateDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => TransitionDto)
  transitions: TransitionDto[];
}

export class CreateAutomatonDto {
  @IsString() @MaxLength(120) name: string;

  @IsOptional() @IsIn(['afd', 'afn'])
  kind?: AutomatonKind;

  @IsDefined() @ValidateNested() @Type(() => AutomatonModelDto)
  model: AutomatonModelDto;
}

export class UpdateAutomatonDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;

  @IsOptional() @IsIn(['afd', 'afn'])
  kind?: AutomatonKind;

  @IsOptional() @ValidateNested() @Type(() => AutomatonModelDto)
  model?: AutomatonModelDto;
}

/** Corpo de POST /automata/determinize: um AFN a converter. */
export class DeterminizeDto {
  @IsDefined() @ValidateNested() @Type(() => AutomatonModelDto)
  model: AutomatonModelDto;
}

/** Corpo de POST /automata/:id/compare: o autômato a comparar com o salvo. */
export class CompareDto {
  @IsDefined() @ValidateNested() @Type(() => AutomatonModelDto)
  model: AutomatonModelDto;
}
