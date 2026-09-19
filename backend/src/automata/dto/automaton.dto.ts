import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt,
  IsOptional, IsString, Matches, MaxLength, ValidateNested,
} from 'class-validator';
import { AutomatonKind } from '../../domain/automaton';

export class StateDto {
  @IsString() id: string;
  @IsString() @MaxLength(40) name: string;
  @IsBoolean() initial: boolean;
  @IsBoolean() accepting: boolean;
  @IsInt() x: number;
  @IsInt() y: number;
}

export class TransitionDto {
  @IsString() from: string;
  @IsString() to: string;
  @IsArray() @IsString({ each: true }) symbols: string[];
}

export class AutomatonModelDto {
  @IsOptional() @IsIn(['afd', 'afn'])
  kind?: AutomatonKind;

  /** Σ: 1 a 10 símbolos de um caractere cada, sem repetição e sem ε. */
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ArrayUnique()
  @Matches(/^[^\sε]$/u, { each: true, message: 'cada símbolo de Σ deve ser um único caractere (e não ε)' })
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

  @ValidateNested() @Type(() => AutomatonModelDto)
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
  @ValidateNested() @Type(() => AutomatonModelDto)
  model: AutomatonModelDto;
}

/** Corpo de POST /automata/:id/compare: o autômato a comparar com o salvo. */
export class CompareDto {
  @ValidateNested() @Type(() => AutomatonModelDto)
  model: AutomatonModelDto;
}
